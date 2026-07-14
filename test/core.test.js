import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, fromPreset, normalizeConfig, PRESETS, PRESET_INFO } from '../src/core/index.js';

test('node-service: Hono app, Dockerfile, private, start script', () => {
  const out = generate(fromPreset('node-service', { name: 'svc' }));
  assert.ok(out.files['src/app.ts'], 'app');
  assert.ok(out.files['src/index.ts'], 'server entry');
  assert.ok(out.files['Dockerfile'], 'Dockerfile');
  assert.match(out.files['src/app.ts'], /new Hono\(\)/);
  const pkg = JSON.parse(out.files['package.json']);
  assert.equal(pkg.private, true);
  assert.ok(pkg.dependencies.hono);
  assert.equal(pkg.scripts.start, 'node dist/index.js');
});

test('react-app: Vite SPA, index.html, private, no exports', () => {
  const out = generate(fromPreset('react-app', { name: 'ra' }));
  assert.ok(out.files['index.html']);
  assert.ok(out.files['src/main.tsx']);
  assert.ok(out.files['vite.config.ts']);
  const pkg = JSON.parse(out.files['package.json']);
  assert.equal(pkg.private, true);
  assert.equal(pkg.exports, undefined);
  assert.match(pkg.scripts.dev, /vite/);
});

test('vue-lib: Vite lib build with types, peer vue, vue-tsc typecheck', () => {
  const out = generate(fromPreset('vue-lib', { name: 'vl' }));
  assert.ok(out.files['src/Button.vue']);
  assert.match(out.files['vite.config.ts'], /plugin-vue/);
  const pkg = JSON.parse(out.files['package.json']);
  assert.equal(pkg.peerDependencies.vue, '>=3');
  assert.equal(pkg.scripts.typecheck, 'vue-tsc --noEmit');
  assert.ok(pkg.exports['.'].types);
});

test('svelte-lib: ships source, no build, svelte export field', () => {
  const out = generate(fromPreset('svelte-lib', { name: 'sl' }));
  assert.ok(out.files['src/Button.svelte']);
  assert.ok(out.files['svelte.config.js']);
  const pkg = JSON.parse(out.files['package.json']);
  assert.equal(pkg.scripts.build, undefined, 'no build');
  assert.ok(pkg.svelte);
  assert.equal(pkg.peerDependencies.svelte, '>=5');
  assert.equal(out.config.hasBuild, false);
});

test('storybook: config + story + deps for a react library', () => {
  const out = generate(fromPreset('react-lib', { name: 's', storybook: true }));
  assert.ok(out.files['.storybook/main.ts']);
  assert.ok(out.files['src/Button.stories.tsx']);
  const pkg = JSON.parse(out.files['package.json']);
  assert.ok(pkg.devDependencies['@storybook/react-vite']);
  assert.ok(pkg.scripts['build-storybook']);
  // storybook is ignored where it doesn't apply (no framework)
  assert.equal(generate(fromPreset('ts-lib', { name: 's', storybook: true })).config.storybook, false);
});

test('vue-app / svelte-app: private Vite SPAs', () => {
  for (const p of ['vue-app', 'svelte-app']) {
    const out = generate(fromPreset(p, { name: p }));
    assert.ok(out.files['index.html'], `${p} index.html`);
    assert.ok(out.files['vite.config.ts'], `${p} vite config`);
    assert.equal(JSON.parse(out.files['package.json']).private, true, `${p} private`);
  }
});

test('storybook + pages workflow deploys the built catalog', () => {
  const out = generate(fromPreset('react-lib', { name: 's', storybook: true, workflows: ['ci', 'pages'] }));
  const wf = out.files['.github/workflows/pages.yml'];
  assert.match(wf, /build-storybook/);
  assert.match(wf, /storybook-static/);
});

test('README badges reflect config (npm for libs, none for private apps)', () => {
  const lib = generate(fromPreset('ts-lib', { name: 'l', repo: 'https://github.com/x/l' })).files['README.md'];
  assert.match(lib, /shields\.io\/npm\/v\/l/);
  assert.match(lib, /actions\/workflows\/ci\.yml\/badge/);
  const app = generate(fromPreset('react-app', { name: 'a' })).files['README.md'];
  assert.doesNotMatch(app, /shields\.io\/npm/); // private app: no npm badge
});

test('package checks + knip: scripts, deps, CI steps', () => {
  const out = generate(fromPreset('ts-lib', { name: 'c', pkgChecks: true, knip: true, workflows: ['ci'] }));
  const pkg = JSON.parse(out.files['package.json']);
  // ESM-only packages use attw's esm-only profile (no false CJS failure); dual keeps default.
  assert.equal(pkg.scripts['check:pkg'], 'publint && attw --pack --profile esm-only');
  const dual = generate(fromPreset('ts-lib', { name: 'c', pkgChecks: true, moduleFormat: 'dual' }));
  assert.equal(JSON.parse(dual.files['package.json']).scripts['check:pkg'], 'publint && attw --pack');
  assert.ok(pkg.devDependencies.publint && pkg.devDependencies['@arethetypeswrong/cli'] && pkg.devDependencies.knip);
  assert.match(out.files['.github/workflows/ci.yml'], /check:pkg/);
  // pkgChecks is coerced off for non-publishable targets
  assert.equal(generate(fromPreset('react-app', { name: 'c', pkgChecks: true })).config.pkgChecks, false);
});

test('lefthook prepare tolerates a missing .git (|| true)', () => {
  const out = generate(fromPreset('ts-cli', { name: 'h', gitHooks: 'lefthook' }));
  assert.equal(JSON.parse(out.files['package.json']).scripts.prepare, 'lefthook install || true');
});

test('jsr: jsr.json + workflow for a plain TS library only', () => {
  const out = generate(fromPreset('ts-lib', { name: 'j', jsr: true }));
  assert.ok(out.files['jsr.json']);
  assert.ok(out.files['.github/workflows/jsr.yml']);
  assert.match(out.files['jsr.json'], /@scope\/j/);
  // not offered for JS or framework libs
  assert.equal(generate(fromPreset('react-lib', { name: 'j', jsr: true })).config.jsr, false);
  assert.equal(generate(fromPreset('js-lib', { name: 'j', jsr: true })).config.jsr, false);
});

test('generated workflows are well-formed (steps: present under each job)', () => {
  const out = generate(fromPreset('oss', { name: 'w' }));
  for (const path of Object.keys(out.files).filter((f) => f.startsWith('.github/workflows/'))) {
    const yml = out.files[path];
    if (yml.includes('runs-on:')) {
      assert.match(yml, /\n {4}steps:\n/, `${path} must have a steps: key`);
    }
  }
});

test('monorepo: pnpm/turbo workspace with two linked packages', () => {
  const out = generate(fromPreset('monorepo', { name: 'acme' }));
  assert.ok(out.files['turbo.json']);
  assert.ok(out.files['pnpm-workspace.yaml']);
  assert.ok(out.files['packages/core/package.json']);
  assert.ok(out.files['packages/utils/package.json']);
  const root = JSON.parse(out.files['package.json']);
  assert.equal(root.private, true);
  assert.match(root.scripts.build, /turbo/);
  // utils depends on core via the workspace protocol
  const utils = JSON.parse(out.files['packages/utils/package.json']);
  assert.equal(utils.dependencies['@acme/core'], 'workspace:*');
  assert.match(out.files['packages/utils/src/index.ts'], /@acme\/core/);
});

test('every preset has an info gist', () => {
  for (const name of Object.keys(PRESETS)) assert.ok(PRESET_INFO[name], `info for ${name}`);
});

test('ts-lib: ESM-only package.json by default (no require condition)', () => {
  const out = generate(fromPreset('ts-lib', { name: 'x-lib' }));
  assert.ok(out.files['src/index.ts']);
  const pkg = JSON.parse(out.files['package.json']);
  assert.equal(pkg.name, 'x-lib');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.license, 'MIT');
  // ESM-only: import condition only, no CJS surface.
  assert.equal(pkg.exports['.'].import.types, './dist/index.d.ts');
  assert.equal(pkg.exports['.'].import.default, './dist/index.js');
  assert.equal(pkg.exports['.'].require, undefined);
  assert.equal(pkg.main, './dist/index.js');
});

test('--module dual: per-condition types (import → .d.ts, require → .d.cts)', () => {
  const out = generate(fromPreset('ts-lib', { name: 'x-lib', moduleFormat: 'dual' }));
  const pkg = JSON.parse(out.files['package.json']);
  // import → .d.ts, require → .d.cts (publint / are-the-types-wrong correct)
  assert.equal(pkg.exports['.'].import.types, './dist/index.d.ts');
  assert.equal(pkg.exports['.'].import.default, './dist/index.js');
  assert.equal(pkg.exports['.'].require.types, './dist/index.d.cts');
  assert.equal(pkg.exports['.'].require.default, './dist/index.cjs');
});

test('cli preset: adds a bin and cli entry', () => {
  const out = generate(fromPreset('cli', { name: 'y-cli' }));
  const pkg = JSON.parse(out.files['package.json']);
  assert.ok(pkg.bin && pkg.bin['y-cli']);
  assert.ok(out.files['src/cli.ts']);
});

test('e2e: react-app --e2e adds Playwright config, spec, script, workflow', () => {
  const out = generate(fromPreset('react-app', { name: 'demo-app', e2e: true, workflows: ['ci'] }));
  assert.ok(out.files['playwright.config.ts']);
  assert.ok(out.files['e2e/app.spec.ts']);
  assert.ok(out.files['.github/workflows/e2e.yml']);
  const pkg = JSON.parse(out.files['package.json']);
  assert.equal(pkg.scripts['test:e2e'], 'playwright test');
  assert.ok(pkg.devDependencies['@playwright/test']);
});

test('e2e: ignored for non-app targets', () => {
  const out = generate(fromPreset('ts-lib', { name: 'x', e2e: true }));
  assert.ok(!out.files['playwright.config.ts']);
});

test('sourcemaps: ts-lib ships src + declaration maps by default', () => {
  const out = generate(fromPreset('ts-lib', { name: 'x' }));
  const pkg = JSON.parse(out.files['package.json']);
  assert.ok(pkg.files.includes('src'));
  assert.equal(JSON.parse(out.files['tsconfig.json']).compilerOptions.declarationMap, true);
});

test('sourcemaps: --no-sourcemaps drops src + maps', () => {
  const out = generate(fromPreset('ts-lib', { name: 'x', sourcemaps: false }));
  const pkg = JSON.parse(out.files['package.json']);
  assert.ok(!pkg.files.includes('src'));
  assert.ok(!JSON.parse(out.files['tsconfig.json']).compilerOptions.declarationMap);
});

test('env: node-service --env adds validated env + wires the server', () => {
  const out = generate(fromPreset('node-service', { name: 'svc', env: true }));
  assert.ok(out.files['src/env.ts']);
  assert.ok(out.files['.env.example']);
  assert.ok(JSON.parse(out.files['package.json']).dependencies.zod);
  assert.match(out.files['src/index.ts'], /import \{ env \} from '\.\/env\.js'/);
});

test('env: ignored for libraries', () => {
  const out = generate(fromPreset('ts-lib', { name: 'x', env: true }));
  assert.ok(!out.files['src/env.ts']);
});

test('service: hardened Dockerfile (non-root + healthcheck)', () => {
  const out = generate(fromPreset('node-service', { name: 'svc' }));
  assert.match(out.files.Dockerfile, /USER node/);
  assert.match(out.files.Dockerfile, /HEALTHCHECK/);
});

test('doctor: script for all; postinstall only for private (non-published) projects', () => {
  const service = generate(fromPreset('node-service', { name: 'svc', doctor: true }));
  assert.ok(service.files['scripts/doctor.mjs']);
  const spkg = JSON.parse(service.files['package.json']);
  assert.equal(spkg.scripts.doctor, 'node scripts/doctor.mjs');
  assert.equal(spkg.scripts.postinstall, 'node scripts/doctor.mjs');
  const lib = generate(fromPreset('ts-lib', { name: 'x', doctor: true }));
  assert.ok(lib.files['scripts/doctor.mjs']);
  assert.ok(!JSON.parse(lib.files['package.json']).scripts.postinstall);
});

test('service frameworks: fastify and express generate their own app + deps', () => {
  const fastify = generate(fromPreset('node-service', { name: 'svc', serviceFramework: 'fastify' }));
  assert.match(fastify.files['src/app.ts'], /import Fastify from 'fastify'/);
  assert.ok(JSON.parse(fastify.files['package.json']).dependencies.fastify);
  assert.match(fastify.files['src/index.ts'], /app\.listen\(\{ port/);

  const express = generate(fromPreset('node-service', { name: 'svc', serviceFramework: 'express' }));
  assert.match(express.files['src/app.ts'], /import express from 'express'/);
  const pkg = JSON.parse(express.files['package.json']);
  assert.ok(pkg.dependencies.express);
  assert.ok(pkg.devDependencies.supertest); // express test needs supertest
  assert.match(express.files['src/index.test.ts'], /supertest/);

  const hono = generate(fromPreset('node-service', { name: 'svc' }));
  assert.match(hono.files['src/app.ts'], /from 'hono'/);
});

test('size-limit: library gets config + script; ignored for apps', () => {
  const lib = generate(fromPreset('ts-lib', { name: 'x', sizeLimit: true }));
  assert.ok(lib.files['.size-limit.json']);
  assert.equal(JSON.parse(lib.files['package.json']).scripts.size, 'size-limit');
  const app = generate(fromPreset('react-app', { name: 'a', sizeLimit: true }));
  assert.ok(!app.files['.size-limit.json']);
});

test('canary: changesets + canary emits the workflow; gated otherwise', () => {
  const on = generate(fromPreset('oss', { name: 'lib', canary: true }));
  assert.ok(on.files['.github/workflows/canary.yml']);
  const off = generate(fromPreset('ts-lib', { name: 'lib', release: 'release-it', canary: true }));
  assert.ok(!off.files['.github/workflows/canary.yml']);
});

test('full preset: workflows + community + agents present', () => {
  const out = generate(fromPreset('full', { name: 'z' }));
  assert.ok(out.files['.github/workflows/ci.yml']);
  assert.ok(out.files['.github/workflows/release.yml']);
  assert.ok(out.files['AGENTS.md']);
  assert.ok(out.files['CONTRIBUTING.md']);
  assert.ok(out.files['LICENSE']);
});

test('react-lib: JSX source, peer deps, jsdom tests', () => {
  const out = generate(fromPreset('react-lib', { name: 'rl' }));
  assert.ok(out.files['src/index.tsx'], 'tsx entry');
  assert.ok(out.files['src/index.test.tsx'], 'tsx test');
  assert.match(out.files['vitest.config.ts'], /jsdom/);
  const pkg = JSON.parse(out.files['package.json']);
  assert.equal(pkg.peerDependencies.react, '>=18');
  assert.ok(pkg.devDependencies['@types/react']);
  assert.ok(pkg.devDependencies['@testing-library/react']);
  assert.equal(JSON.parse(out.files['tsconfig.json']).compilerOptions.jsx, 'react-jsx');
});

test('minify: flows into the tsup config, off by default and with no bundler', () => {
  assert.match(generate(fromPreset('ts-lib', { name: 'm', minify: true })).files['tsup.config.ts'], /minify: true/);
  assert.doesNotMatch(generate(fromPreset('ts-lib', { name: 'm' })).files['tsup.config.ts'], /minify: true/);
  // no bundler → minify is coerced off (nothing to minify)
  const none = generate(normalizeConfig({ name: 'm', bundler: 'none', minify: true }));
  assert.equal(none.config.minify, false);
});

test('minimal preset: no tooling extras', () => {
  const out = generate(fromPreset('minimal', { name: 'm' }));
  assert.equal(out.files['vitest.config.ts'], undefined);
  assert.equal(out.files['eslint.config.js'], undefined);
  assert.equal(out.files['AGENTS.md'], undefined);
});

test('js library: no tsconfig, ships src or dist', () => {
  const out = generate(normalizeConfig({ name: 'j', language: 'js', bundler: 'none' }));
  assert.equal(out.files['tsconfig.json'], undefined);
  const pkg = JSON.parse(out.files['package.json']);
  assert.ok(pkg.exports['.']);
});

test('every generated package.json parses', () => {
  for (const preset of ['ts-lib', 'js-lib', 'cli', 'minimal', 'full']) {
    const out = generate(fromPreset(preset, { name: 'p' }));
    assert.doesNotThrow(() => JSON.parse(out.files['package.json']), preset);
  }
});
