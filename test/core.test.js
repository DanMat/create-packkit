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

test('every preset has an info gist', () => {
  for (const name of Object.keys(PRESETS)) assert.ok(PRESET_INFO[name], `info for ${name}`);
});

test('ts-lib: valid package.json with dual exports', () => {
  const out = generate(fromPreset('ts-lib', { name: 'x-lib' }));
  assert.ok(out.files['src/index.ts']);
  const pkg = JSON.parse(out.files['package.json']);
  assert.equal(pkg.name, 'x-lib');
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.exports['.'].import);
  assert.ok(pkg.exports['.'].require);
  assert.ok(pkg.exports['.'].types);
});

test('cli preset: adds a bin and cli entry', () => {
  const out = generate(fromPreset('cli', { name: 'y-cli' }));
  const pkg = JSON.parse(out.files['package.json']);
  assert.ok(pkg.bin && pkg.bin['y-cli']);
  assert.ok(out.files['src/cli.ts']);
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
