// The single source of truth for every choice Packkit offers.
// Both the CLI wizard and the web configurator render from this schema, and
// `normalizeConfig` turns partial/user input into a complete, valid config.

/** @typedef {'select'|'multiselect'|'boolean'|'text'} OptionType */

export const OPTIONS = {
  // ---- package metadata ----
  name: { group: 'meta', type: 'text', label: 'Package name', default: 'my-package' },
  description: { group: 'meta', type: 'text', label: 'Description', default: '' },
  author: { group: 'meta', type: 'text', label: 'Author', default: '' },
  keywords: { group: 'meta', type: 'text', label: 'Keywords (comma-separated)', default: '' },
  repo: { group: 'meta', type: 'text', label: 'Repository URL', default: '' },

  // ---- core shape ----
  language: {
    group: 'core', type: 'select', label: 'Language', default: 'ts',
    choices: [
      { value: 'ts', label: 'TypeScript (strict)' },
      { value: 'js', label: 'JavaScript (ESM)' },
    ],
  },
  moduleFormat: {
    group: 'core', type: 'select', label: 'Module format', default: 'dual',
    choices: [
      { value: 'esm', label: 'ESM only' },
      { value: 'cjs', label: 'CommonJS only' },
      { value: 'dual', label: 'Dual (ESM + CJS)' },
    ],
  },
  target: {
    group: 'core', type: 'multiselect', label: 'What are you building?', default: ['library'],
    choices: [
      { value: 'library', label: 'Library (importable package)' },
      { value: 'cli', label: 'CLI tool (ships a bin)' },
      { value: 'service', label: 'HTTP service (Hono)' },
      { value: 'app', label: 'App (Vite SPA)' },
    ],
  },
  monorepo: {
    group: 'core', type: 'boolean', label: 'Monorepo (pnpm/Turborepo workspace)', default: false,
  },
  framework: {
    group: 'core', type: 'select', label: 'Framework', default: 'none',
    choices: [
      { value: 'none', label: 'None (plain package)' },
      { value: 'react', label: 'React' },
      { value: 'vue', label: 'Vue' },
      { value: 'svelte', label: 'Svelte' },
    ],
  },
  packageManager: {
    group: 'core', type: 'select', label: 'Package manager', default: 'npm',
    choices: [
      { value: 'npm', label: 'npm' },
      { value: 'pnpm', label: 'pnpm' },
      { value: 'yarn', label: 'yarn' },
      { value: 'bun', label: 'bun' },
    ],
  },
  nodeVersion: {
    group: 'core', type: 'select', label: 'Node version', default: '20',
    choices: [
      { value: '18', label: '18 (LTS)' },
      { value: '20', label: '20 (LTS)' },
      { value: '22', label: '22 (LTS)' },
    ],
  },

  // ---- build ----
  bundler: {
    group: 'build', type: 'select', label: 'Bundler / build', default: 'tsup',
    choices: [
      { value: 'tsup', label: 'tsup (esbuild — recommended)' },
      { value: 'tsdown', label: 'tsdown (Rolldown — fast successor)' },
      { value: 'unbuild', label: 'unbuild (UnJS)' },
      { value: 'rollup', label: 'Rollup' },
      { value: 'none', label: 'None (tsc / no build)' },
    ],
  },
  minify: {
    group: 'build', type: 'boolean', label: 'Minify output (best for CLIs / browser bundles)', default: false,
  },

  // ---- testing ----
  test: {
    group: 'quality', type: 'select', label: 'Test runner', default: 'vitest',
    choices: [
      { value: 'vitest', label: 'Vitest (recommended)' },
      { value: 'jest', label: 'Jest' },
      { value: 'node', label: 'node:test (built-in)' },
      { value: 'none', label: 'None' },
    ],
  },
  coverage: { group: 'quality', type: 'boolean', label: 'Coverage reporting', default: true },
  storybook: { group: 'quality', type: 'boolean', label: 'Storybook (component libraries)', default: false },
  pkgChecks: { group: 'quality', type: 'boolean', label: 'Package checks (publint + are-the-types-wrong)', default: false },
  knip: { group: 'quality', type: 'boolean', label: 'Knip (unused files / deps / exports)', default: false },

  // ---- lint / format ----
  lint: {
    group: 'quality', type: 'select', label: 'Lint / format', default: 'eslint-prettier',
    choices: [
      { value: 'eslint-prettier', label: 'ESLint + Prettier (recommended)' },
      { value: 'biome', label: 'Biome (all-in-one)' },
      { value: 'oxlint', label: 'oxlint + Prettier (fast)' },
      { value: 'none', label: 'None' },
    ],
  },

  // ---- git hooks ----
  gitHooks: {
    group: 'quality', type: 'select', label: 'Git hooks', default: 'simple-git-hooks',
    choices: [
      { value: 'simple-git-hooks', label: 'simple-git-hooks (light)' },
      { value: 'husky', label: 'husky + lint-staged' },
      { value: 'lefthook', label: 'lefthook' },
      { value: 'none', label: 'None' },
    ],
  },

  // ---- release ----
  release: {
    group: 'release', type: 'select', label: 'Release / versioning', default: 'changesets',
    choices: [
      { value: 'changesets', label: 'Changesets (recommended)' },
      { value: 'release-it', label: 'release-it' },
      { value: 'np', label: 'np' },
      { value: 'none', label: 'None' },
    ],
  },
  jsr: { group: 'release', type: 'boolean', label: 'Publish to JSR (TS-first registry)', default: false },

  // ---- github actions (configurable workflows) ----
  workflows: {
    group: 'ci', type: 'multiselect', label: 'GitHub Actions',
    default: ['ci', 'npm-publish'],
    choices: [
      { value: 'ci', label: 'CI (typecheck + lint + test + build)' },
      { value: 'npm-publish', label: 'Publish to npm (provenance / OIDC)' },
      { value: 'pages', label: 'Deploy GitHub Pages' },
      { value: 'codeql', label: 'CodeQL security scan' },
      { value: 'codecov', label: 'Upload coverage to Codecov' },
      { value: 'stale', label: 'Stale issue/PR bot' },
    ],
  },
  deps: {
    group: 'ci', type: 'select', label: 'Dependency updates', default: 'renovate',
    choices: [
      { value: 'renovate', label: 'Renovate' },
      { value: 'dependabot', label: 'Dependabot' },
      { value: 'none', label: 'None' },
    ],
  },

  // ---- repo hygiene ----
  license: {
    group: 'repo', type: 'select', label: 'License', default: 'MIT',
    choices: [
      { value: 'MIT', label: 'MIT' },
      { value: 'Apache-2.0', label: 'Apache-2.0' },
      { value: 'ISC', label: 'ISC' },
      { value: 'none', label: 'None' },
    ],
  },
  community: { group: 'repo', type: 'boolean', label: 'Community files (CONTRIBUTING, CoC, SECURITY, templates)', default: true },
  agents: { group: 'repo', type: 'boolean', label: 'AI agent instructions (AGENTS.md + CLAUDE.md)', default: true },
  vscode: { group: 'repo', type: 'boolean', label: 'VS Code settings + extensions', default: true },
  editorconfig: { group: 'repo', type: 'boolean', label: '.editorconfig', default: true },
  gitInit: { group: 'repo', type: 'boolean', label: 'git init + initial commit', default: true },
  install: { group: 'repo', type: 'boolean', label: 'Install dependencies', default: true },
};

export const GROUPS = [
  { id: 'meta', label: 'Package' },
  { id: 'core', label: 'Core' },
  { id: 'build', label: 'Build' },
  { id: 'quality', label: 'Quality' },
  { id: 'release', label: 'Release' },
  { id: 'ci', label: 'CI / CD' },
  { id: 'repo', label: 'Repository' },
];

/** Build a default config from the schema. */
export function defaultConfig() {
  const cfg = {};
  for (const [key, opt] of Object.entries(OPTIONS)) {
    cfg[key] = Array.isArray(opt.default) ? [...opt.default] : opt.default;
  }
  return cfg;
}

/** Merge partial input over the defaults and coerce a few fields. */
export function normalizeConfig(input = {}) {
  const cfg = { ...defaultConfig(), ...input };

  // A CLI target needs an executable build; JS `strict` isn't a thing, etc.
  if (!Array.isArray(cfg.target) || cfg.target.length === 0) cfg.target = ['library'];
  if (!Array.isArray(cfg.workflows)) cfg.workflows = [];

  // Minify needs a bundler.
  if (cfg.bundler === 'none') cfg.minify = false;
  // Coverage only makes sense with a test runner that supports it.
  if (cfg.test === 'none' || cfg.test === 'node') cfg.coverage = false;
  // Codecov workflow implies coverage.
  if (cfg.workflows.includes('codecov')) cfg.coverage = true;
  // npm-publish + changesets are complementary; nothing to coerce, just noted.

  cfg.isReact = cfg.framework === 'react';
  cfg.isVue = cfg.framework === 'vue';
  cfg.isSvelte = cfg.framework === 'svelte';
  cfg.hasFramework = cfg.framework !== 'none';

  cfg.hasApp = cfg.target.includes('app');
  // A component-framework package that isn't an app is a library.
  if (cfg.hasFramework && !cfg.hasApp && !cfg.target.includes('library')) {
    cfg.target = ['library', ...cfg.target];
  }

  cfg.isTs = cfg.language === 'ts';
  cfg.ext = cfg.isTs ? 'ts' : 'js';
  // JSX source extension for React; Vue/Svelte use their own component files.
  cfg.srcExt = cfg.isReact ? (cfg.isTs ? 'tsx' : 'jsx') : cfg.ext;

  cfg.hasLibrary = cfg.target.includes('library');
  cfg.hasCli = cfg.target.includes('cli');
  cfg.hasService = cfg.target.includes('service');

  // Vite builds apps and Vue libraries (SFCs); Svelte libraries ship source
  // (no build); React libraries use tsup (JSX is native to esbuild).
  cfg.viteBuild = cfg.hasApp || cfg.isVue;
  cfg.svelteLib = cfg.isSvelte && !cfg.hasApp;
  cfg.customBuild = cfg.viteBuild || cfg.svelteLib; // bundler.js steps aside
  cfg.usesVite = cfg.viteBuild || cfg.isSvelte; // Svelte tests need the vite plugin too
  // Whether a `build` script exists (Svelte libraries ship source, no build).
  cfg.hasBuild = cfg.viteBuild || (!cfg.svelteLib && (cfg.bundler !== 'none' || cfg.isTs));

  // Apps aren't published packages.
  if (cfg.hasApp) cfg.moduleFormat = 'esm';
  cfg.hasEsm = cfg.moduleFormat === 'esm' || cfg.moduleFormat === 'dual';
  cfg.hasCjs = cfg.moduleFormat === 'cjs' || cfg.moduleFormat === 'dual';

  // Storybook only applies to component libraries.
  if (!cfg.hasFramework || cfg.hasApp || !cfg.hasLibrary) cfg.storybook = false;

  // A monorepo is its own generation path (see buildMonorepo); it has a build.
  if (cfg.monorepo) cfg.hasBuild = true;

  cfg.publishable = (cfg.hasLibrary || cfg.hasCli) && !cfg.hasApp && !cfg.hasService;
  // Package-correctness checks only make sense for a publishable package.
  if (!cfg.publishable) cfg.pkgChecks = false;
  // JSR is TypeScript-first, ESM, and for plain (non-framework) libraries.
  if (!(cfg.isTs && cfg.hasLibrary && !cfg.hasFramework && !cfg.hasApp)) cfg.jsr = false;
  return cfg;
}
