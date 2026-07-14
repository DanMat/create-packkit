// Monorepo generation — a pnpm/Turborepo (or npm/yarn workspaces) workspace
// with Changesets and two example packages (one depending on the other).
// This is a distinct shape from a single package, so generate() delegates here.

import { toJson } from './render.js';
import community from './features/community.js';
import agents from './features/agents.js';
import gitfiles from './features/gitfiles.js';

export function buildMonorepo(cfg) {
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
  const setup = ['      - uses: actions/checkout@v4'];
  if (pm === 'pnpm') setup.push('      - uses: pnpm/action-setup@v4');
  setup.push(
    '      - uses: actions/setup-node@v4',
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
