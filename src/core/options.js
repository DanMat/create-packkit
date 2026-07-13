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
    ],
  },
  framework: {
    group: 'core', type: 'select', label: 'Framework', default: 'none',
    choices: [
      { value: 'none', label: 'None (plain package)' },
      { value: 'react', label: 'React (component library)' },
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

  // Coverage only makes sense with a test runner that supports it.
  if (cfg.test === 'none' || cfg.test === 'node') cfg.coverage = false;
  // Codecov workflow implies coverage.
  if (cfg.workflows.includes('codecov')) cfg.coverage = true;
  // npm-publish + changesets are complementary; nothing to coerce, just noted.

  cfg.isReact = cfg.framework === 'react';
  // A React component library is a library; make sure it's targeted.
  if (cfg.isReact && !cfg.target.includes('library')) cfg.target = ['library', ...cfg.target];

  cfg.isTs = cfg.language === 'ts';
  cfg.ext = cfg.isTs ? 'ts' : 'js';
  // Source files carry JSX for React; config files keep .ts/.js.
  cfg.srcExt = cfg.isReact ? (cfg.isTs ? 'tsx' : 'jsx') : cfg.ext;
  cfg.hasLibrary = cfg.target.includes('library');
  cfg.hasCli = cfg.target.includes('cli');
  cfg.hasEsm = cfg.moduleFormat === 'esm' || cfg.moduleFormat === 'dual';
  cfg.hasCjs = cfg.moduleFormat === 'cjs' || cfg.moduleFormat === 'dual';
  return cfg;
}
