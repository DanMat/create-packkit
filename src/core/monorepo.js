// Monorepo generation — a pnpm/Turborepo (or npm/yarn workspaces) workspace
// with Changesets and two example packages (one depending on the other).
// This is a distinct shape from a single package, so generate() delegates here.

import { toJson } from './render.js';
import community from './features/community.js';
import agents from './features/agents.js';
import gitfiles from './features/gitfiles.js';
import { provenance } from './provenance.js';

export function buildMonorepo(cfg) {
  // Two genuinely different shapes: a set of publishable libraries, or a
  // deployable app (web + server + shared code). They differ in workspace
  // globs, whether anything publishes, and what `dev` means, so they don't
  // usefully share a code path.
  if (cfg.monorepoLayout === 'fullstack') return buildFullstack(cfg);

  const files = {};
  const pm = cfg.packageManager;
  const scope = cfg.name.replace(/^@/, '').split('/')[0];
  const core = `@${scope}/core`;
  const utils = `@${scope}/utils`;
  const wsProto = pm === 'pnpm' ? 'workspace:*' : '*';

  // Reuse the package-agnostic root files (LICENSE, community, AGENTS.md, gitignore).
  for (const feat of [community, agents, gitfiles]) {
    if (feat.active(cfg)) Object.assign(files, feat.apply(cfg).files);
  }

  // ---- root ----
  const rootPkg = {
    name: cfg.name,
    version: '0.0.0',
    private: true,
    type: 'module',
    ...(cfg.license !== 'none' ? { license: cfg.license } : {}),
    ...(pm === 'pnpm' ? { packageManager: 'pnpm@9.10.0' } : { workspaces: ['packages/*'] }),
    scripts: {
      build: 'turbo build',
      test: 'turbo test',
      lint: 'turbo lint',
      typecheck: 'turbo typecheck',
      dev: 'turbo dev',
      changeset: 'changeset',
      version: 'changeset version',
      release: 'turbo build && changeset publish',
    },
    devDependencies: {
      turbo: '^2.0.0',
      typescript: '^5.9.3',
      tsup: '^8.0.0',
      vitest: '^4.0.0',
      eslint: '^10.0.0',
      '@eslint/js': '^10.0.0',
      'typescript-eslint': '^8.0.0',
      prettier: '^3.3.0',
      '@changesets/cli': '^2.27.0',
      '@types/node': `^${cfg.nodeVersion}.0.0`,
    },
  };
  files['package.json'] = toJson(rootPkg);

  if (pm === 'pnpm') files['pnpm-workspace.yaml'] = 'packages:\n  - "packages/*"\n';

  files['turbo.json'] = toJson({
    $schema: 'https://turbo.build/schema.json',
    tasks: {
      build: { dependsOn: ['^build'], outputs: ['dist/**'] },
      test: { dependsOn: ['^build'] },
      typecheck: { dependsOn: ['^build'] },
      lint: {},
      dev: { cache: false, persistent: true },
    },
  });

  files['tsconfig.base.json'] = toJson({
    $schema: 'https://json.schemastore.org/tsconfig',
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2022'],
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: true,
      noEmit: true,
    },
  });

  files['.changeset/config.json'] = toJson({
    $schema: 'https://unpkg.com/@changesets/config@3.0.0/schema.json',
    changelog: '@changesets/cli/changelog',
    commit: false,
    access: 'public',
    baseBranch: 'main',
  });
  files['.changeset/README.md'] = '# Changesets\n\nRun `npx changeset` to record a version bump for your next release.\n';

  files['eslint.config.js'] = [
    `import js from '@eslint/js';`,
    `import tseslint from 'typescript-eslint';`,
    ``,
    `export default tseslint.config(`,
    `\tjs.configs.recommended,`,
    `\t...tseslint.configs.recommended,`,
    `\t{ ignores: ['**/dist'] },`,
    `);`,
    ``,
  ].join('\n');
  files['.prettierrc.json'] = toJson({ useTabs: true, singleQuote: true, semi: true, printWidth: 100, trailingComma: 'all' });

  files['README.md'] = rootReadme(cfg, pm, core, utils);
  files['packkit.json'] = provenance(cfg);
  files['.github/workflows/ci.yml'] = ciWorkflow(cfg, pm);

  // ---- packages ----
  addPackage(files, {
    name: core,
    dir: 'packages/core',
    src: [
      `/** Greet someone by name. */`,
      `export function greet(name: string): string {`,
      `\treturn \`Hello, \${name}!\`;`,
      `}`,
      ``,
    ].join('\n'),
    test: exampleTest(`import { greet } from './index.js';`, `expect(greet('world')).toBe('Hello, world!')`),
    deps: {},
  });

  addPackage(files, {
    name: utils,
    dir: 'packages/utils',
    src: [
      `import { greet } from '${core}';`,
      ``,
      `/** Greet someone, loudly. */`,
      `export function shout(name: string): string {`,
      `\treturn greet(name).toUpperCase();`,
      `}`,
      ``,
    ].join('\n'),
    test: exampleTest(`import { shout } from './index.js';`, `expect(shout('world')).toBe('HELLO, WORLD!')`),
    deps: { [core]: wsProto },
  });

  const install = pm === 'npm' ? 'npm install' : `${pm} install`;
  return {
    config: cfg,
    files,
    postCommands: cfg.gitInit ? ['git init', 'git add -A', 'git commit -m "Initial commit from Packkit"'] : [],
    summary: {
      name: cfg.name,
      fileCount: Object.keys(files).length,
      stack: ['monorepo', `${pm}+turbo`, 'TypeScript', 'tsup', 'vitest', 'changesets'],
      workflows: ['ci'],
    },
  };
}

// ---------------------------------------------------------------------------
// Full-stack layout: apps/web + apps/server + packages/shared.
//
// The pieces already existed as standalone presets (react-app, node-service);
// what was missing was the composition — workspace wiring, one shared package
// both sides import, and a production story where the server serves the built
// web assets instead of needing a second host.
// ---------------------------------------------------------------------------
function buildFullstack(cfg) {
  const files = {};
  const pm = cfg.packageManager;
  const scope = cfg.name.replace(/^@/, '').split('/')[0];
  const shared = `@${scope}/shared`;
  const wsProto = pm === 'pnpm' ? 'workspace:*' : '*';
  const run = (s) => (pm === 'npm' ? `npm run ${s}` : `${pm} ${s}`);

  for (const feat of [community, agents, gitfiles]) {
    if (feat.active(cfg)) Object.assign(files, feat.apply(cfg).files);
  }

  files['package.json'] = toJson({
    name: cfg.name,
    version: '0.0.0',
    private: true,
    type: 'module',
    ...(cfg.license !== 'none' ? { license: cfg.license } : {}),
    ...(pm === 'pnpm'
      ? { packageManager: 'pnpm@9.10.0' }
      : { workspaces: ['apps/*', 'packages/*'] }),
    scripts: {
      dev: 'turbo dev',
      build: 'turbo build',
      // Production runs the built server, which also serves the web build.
      start: `${pm === 'npm' ? 'npm --prefix apps/server run' : `${pm} --filter ./apps/server`} start`,
      test: 'turbo test',
      lint: 'turbo lint',
      typecheck: 'turbo typecheck',
    },
    devDependencies: {
      turbo: '^2.0.0',
      typescript: '^5.9.3',
      vitest: '^4.0.0',
      eslint: '^10.0.0',
      '@eslint/js': '^10.0.0',
      'typescript-eslint': '^8.0.0',
      prettier: '^3.3.0',
      '@types/node': `^${cfg.nodeVersion}.0.0`,
    },
  });

  if (pm === 'pnpm') {
    files['pnpm-workspace.yaml'] = 'packages:\n  - "apps/*"\n  - "packages/*"\n';
  }

  files['turbo.json'] = toJson({
    $schema: 'https://turbo.build/schema.json',
    tasks: {
      build: { dependsOn: ['^build'], outputs: ['dist/**'] },
      // Shared is built before the apps start, so both sides always import a
      // current copy without a separate watch process.
      dev: { dependsOn: ['^build'], cache: false, persistent: true },
      test: { dependsOn: ['^build'] },
      typecheck: { dependsOn: ['^build'] },
      lint: {},
    },
  });

  files['tsconfig.base.json'] = toJson({
    $schema: 'https://json.schemastore.org/tsconfig',
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2022', 'DOM'],
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: true,
      noEmit: true,
    },
  });

  files['eslint.config.js'] = [
    `import js from '@eslint/js';`,
    `import tseslint from 'typescript-eslint';`,
    ``,
    `export default tseslint.config(`,
    `\tjs.configs.recommended,`,
    `\t...tseslint.configs.recommended,`,
    `\t{ ignores: ['**/dist'] },`,
    `);`,
    ``,
  ].join('\n');
  files['.prettierrc.json'] = toJson({ useTabs: true, singleQuote: true, semi: true, printWidth: 100, trailingComma: 'all' });
  files['.github/workflows/ci.yml'] = ciWorkflow(cfg, pm);
  files['README.md'] = fullstackReadme(cfg, pm, shared);
  files['packkit.json'] = provenance(cfg);

  // ---- packages/shared: the contract both sides compile against ----
  files['packages/shared/package.json'] = toJson({
    name: shared,
    version: '0.0.0',
    private: true,
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
    scripts: {
      build: 'tsup src/index.ts --format esm --dts --clean',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
      lint: 'eslint .',
    },
    devDependencies: { tsup: '^8.0.0' },
  });
  files['packages/shared/tsconfig.json'] = toJson({ extends: '../../tsconfig.base.json', include: ['src'] });
  files['packages/shared/src/index.ts'] = [
    `/** The shape the server returns and the web app renders. Change it once. */`,
    `export interface Health {`,
    `\tok: boolean;`,
    `\tservice: string;`,
    `\tuptime: number;`,
    `}`,
    ``,
    `export function describeHealth(h: Health): string {`,
    `\treturn h.ok ? \`\${h.service} is up (\${Math.round(h.uptime)}s)\` : \`\${h.service} is down\`;`,
    `}`,
    ``,
  ].join('\n');
  files['packages/shared/src/index.test.ts'] = exampleTest(
    `import { describeHealth } from './index.js';`,
    `expect(describeHealth({ ok: true, service: 'api', uptime: 12 })).toBe('api is up (12s)')`,
  );

  // ---- apps/server ----
  files['apps/server/package.json'] = toJson({
    name: `@${scope}/server`,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsup src/index.ts --format esm --clean',
      start: 'node dist/index.js',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
      lint: 'eslint .',
    },
    dependencies: { hono: '^4.5.0', '@hono/node-server': '^2.0.0', [shared]: wsProto },
    devDependencies: { tsx: '^4.0.0', tsup: '^8.0.0' },
  });
  files['apps/server/tsconfig.json'] = toJson({ extends: '../../tsconfig.base.json', include: ['src'] });
  files['apps/server/src/app.ts'] = [
    `import { Hono } from 'hono';`,
    `import { serveStatic } from '@hono/node-server/serve-static';`,
    `import type { Health } from '${shared}';`,
    ``,
    `export const app = new Hono();`,
    ``,
    `app.get('/api/health', (c) => {`,
    `\tconst body: Health = { ok: true, service: '${cfg.name}', uptime: process.uptime() };`,
    `\treturn c.json(body);`,
    `});`,
    ``,
    `// In production the API also serves the built web app, so one process and`,
    `// one port covers the whole thing. In dev, Vite serves the app and proxies`,
    `// /api here instead (see apps/web/vite.config.ts).`,
    `if (process.env.NODE_ENV === 'production') {`,
    `\tapp.use('/*', serveStatic({ root: '../web/dist' }));`,
    `}`,
    ``,
  ].join('\n');
  files['apps/server/src/index.ts'] = [
    `import { serve } from '@hono/node-server';`,
    `import { app } from './app.js';`,
    ``,
    `const port = Number(process.env.PORT ?? 3000);`,
    `serve({ fetch: app.fetch, port });`,
    `console.log(\`Listening on http://localhost:\${port}\`);`,
    ``,
  ].join('\n');
  files['apps/server/src/app.test.ts'] = [
    `import { describe, it, expect } from 'vitest';`,
    `import { app } from './app.js';`,
    ``,
    `describe('api', () => {`,
    `\tit('reports health', async () => {`,
    `\t\tconst res = await app.request('/api/health');`,
    `\t\texpect(res.status).toBe(200);`,
    `\t\texpect(await res.json()).toMatchObject({ ok: true });`,
    `\t});`,
    `});`,
    ``,
  ].join('\n');

  // ---- apps/web ----
  files['apps/web/package.json'] = toJson({
    name: `@${scope}/web`,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
      lint: 'eslint .',
    },
    dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0', [shared]: wsProto },
    devDependencies: {
      vite: '^8.0.0',
      '@vitejs/plugin-react': '^6.0.0',
      // Without the React types, `turbo typecheck` fails on the very first run
      // with TS7016/TS7026 on every JSX element.
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      '@testing-library/react': '^16.0.0',
      '@testing-library/dom': '^10.0.0',
      jsdom: '^29.0.0',
    },
  });
  files['apps/web/tsconfig.json'] = toJson({
    extends: '../../tsconfig.base.json',
    compilerOptions: { jsx: 'react-jsx' },
    include: ['src'],
  });
  files['apps/web/vite.config.ts'] = [
    `/// <reference types="vitest" />`,
    `import { defineConfig } from 'vite';`,
    `import react from '@vitejs/plugin-react';`,
    ``,
    `export default defineConfig({`,
    `\tplugins: [react()],`,
    `\t// Same-origin /api in dev as in production, so no CORS and no base URL`,
    `\t// juggling between environments.`,
    `\tserver: { proxy: { '/api': 'http://localhost:3000' } },`,
    `\ttest: { environment: 'jsdom' },`,
    `});`,
    ``,
  ].join('\n');
  files['apps/web/src/App.test.tsx'] = [
    `import { describe, it, expect } from 'vitest';`,
    `import { render, screen } from '@testing-library/react';`,
    `import { App } from './App.js';`,
    ``,
    `describe('App', () => {`,
    `\tit('renders the service name', () => {`,
    `\t\trender(<App />);`,
    `\t\texpect(screen.getByRole('heading', { name: '${cfg.name}' })).toBeDefined();`,
    `\t});`,
    `});`,
    ``,
  ].join('\n');
  files['apps/web/index.html'] = [
    `<!doctype html>`,
    `<html lang="en">`,
    `\t<head>`,
    `\t\t<meta charset="UTF-8" />`,
    `\t\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `\t\t<title>${cfg.name}</title>`,
    `\t</head>`,
    `\t<body>`,
    `\t\t<div id="root"></div>`,
    `\t\t<script type="module" src="/src/main.tsx"></script>`,
    `\t</body>`,
    `</html>`,
    ``,
  ].join('\n');
  files['apps/web/src/main.tsx'] = [
    `import { StrictMode } from 'react';`,
    `import { createRoot } from 'react-dom/client';`,
    `import { App } from './App.js';`,
    ``,
    `createRoot(document.getElementById('root')!).render(`,
    `\t<StrictMode>`,
    `\t\t<App />`,
    `\t</StrictMode>,`,
    `);`,
    ``,
  ].join('\n');
  files['apps/web/src/App.tsx'] = [
    `import { useEffect, useState } from 'react';`,
    `import { describeHealth, type Health } from '${shared}';`,
    ``,
    `export function App() {`,
    `\tconst [health, setHealth] = useState<Health | null>(null);`,
    ``,
    `\tuseEffect(() => {`,
    `\t\tfetch('/api/health')`,
    `\t\t\t.then((r) => r.json() as Promise<Health>)`,
    `\t\t\t.then(setHealth)`,
    `\t\t\t.catch(() => setHealth({ ok: false, service: '${cfg.name}', uptime: 0 }));`,
    `\t}, []);`,
    ``,
    `\treturn (`,
    `\t\t<main>`,
    `\t\t\t<h1>${cfg.name}</h1>`,
    `\t\t\t<p>{health ? describeHealth(health) : 'Checking…'}</p>`,
    `\t\t</main>`,
    `\t);`,
    `}`,
    ``,
  ].join('\n');

  return {
    config: cfg,
    files,
    postCommands: cfg.gitInit ? ['git init', 'git add -A', 'git commit -m "Initial commit from Packkit"'] : [],
    summary: {
      name: cfg.name,
      fileCount: Object.keys(files).length,
      stack: ['monorepo', 'full-stack', `${pm}+turbo`, 'React+Vite', 'Hono', 'TypeScript', 'vitest'],
      workflows: ['ci'],
    },
  };
}

function fullstackReadme(cfg, pm, shared) {
  const install = pm === 'npm' ? 'npm install' : `${pm} install`;
  const run = (s) => (pm === 'npm' ? `npm run ${s}` : `${pm} ${s}`);
  return [
    `# ${cfg.name}`,
    '',
    cfg.description || '_A full-stack monorepo scaffolded with [Packkit](https://danmat.github.io/create-packkit/)._',
    '',
    '## Layout',
    '',
    '```',
    'apps/web       React + Vite front end',
    'apps/server    Hono API (also serves the web build in production)',
    'packages/shared  types and helpers both sides import',
    '```',
    '',
    '## Develop',
    '',
    '```sh',
    install,
    run('dev') + '     # web on :5173, api on :3000',
    '```',
    '',
    `Vite proxies \`/api\` to the server, so requests are same-origin in development exactly as they are in production — no CORS, no environment-specific base URL.`,
    '',
    '## Production',
    '',
    '```sh',
    run('build'),
    run('start') + '   # one process serving the API and the built web app',
    '```',
    '',
    `\`${shared}\` is built before either app starts, so a change to a shared type surfaces as a type error on both sides rather than at runtime.`,
    '',
    cfg.license !== 'none' ? `## License\n\n${cfg.license}${cfg.author ? ' © ' + cfg.author : ''}\n` : '',
  ].join('\n');
}

function addPackage(files, { name, dir, src, test, deps }) {
  const pkg = {
    name,
    version: '0.0.0',
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
    files: ['dist'],
    scripts: {
      build: 'tsup src/index.ts --format esm --dts --clean',
      dev: 'tsup src/index.ts --format esm --dts --watch',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
      lint: 'eslint .',
    },
    ...(Object.keys(deps).length ? { dependencies: deps } : {}),
  };
  files[`${dir}/package.json`] = toJson(pkg);
  files[`${dir}/tsconfig.json`] = toJson({ extends: '../../tsconfig.base.json', include: ['src'] });
  files[`${dir}/src/index.ts`] = src;
  files[`${dir}/src/index.test.ts`] = test;
}

function exampleTest(importLine, assertion) {
  return [`import { describe, it, expect } from 'vitest';`, importLine, ``, `describe('example', () => {`, `\tit('works', () => {`, `\t\t${assertion};`, `\t});`, `});`, ``].join('\n');
}

function ciWorkflow(cfg, pm) {
  const setup = ['      - uses: actions/checkout@v7'];
  if (pm === 'pnpm') setup.push('      - uses: pnpm/action-setup@v6');
  setup.push(
    '      - uses: actions/setup-node@v7',
    '        with:',
    `          node-version: '${cfg.nodeVersion}'`,
    `          cache: '${pm === 'yarn' ? 'yarn' : pm === 'pnpm' ? 'pnpm' : 'npm'}'`,
  );
  const install = pm === 'npm' ? 'npm ci' : pm === 'pnpm' ? 'pnpm install --frozen-lockfile' : `${pm} install --frozen-lockfile`;
  const run = (s) => (pm === 'npm' ? `npm run ${s}` : `${pm} ${s}`);
  return [
    'name: CI',
    'on:',
    '  push:',
    '    branches: [main]',
    '  pull_request:',
    'jobs:',
    '  ci:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    setup.join('\n'),
    `      - run: ${install}`,
    `      - run: ${run('typecheck')}`,
    `      - run: ${run('lint')}`,
    `      - run: ${run('test')}`,
    `      - run: ${run('build')}`,
    '',
  ].join('\n');
}

function rootReadme(cfg, pm, core, utils) {
  const install = pm === 'npm' ? 'npm install' : `${pm} install`;
  const run = (s) => (pm === 'npm' ? `npm run ${s}` : `${pm} ${s}`);
  return [
    `# ${cfg.name}`,
    '',
    cfg.description || '_A monorepo scaffolded with [Packkit](https://danmat.github.io/create-packkit/)._',
    '',
    '## Packages',
    '',
    `- \`${core}\` — the core library`,
    `- \`${utils}\` — utilities built on \`${core}\``,
    '',
    '## Develop',
    '',
    '```sh',
    install,
    run('build') + '     # build all packages (Turborepo)',
    run('test'),
    '```',
    '',
    cfg.license !== 'none' ? `## License\n\n${cfg.license}${cfg.author ? ' © ' + cfg.author : ''}\n` : '',
  ].join('\n');
}
