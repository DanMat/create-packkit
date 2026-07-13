// Named presets = partial configs applied over the defaults, so devs can skip
// the wizard: `npx packkit ts-lib my-project`.

export const PRESETS = {
  'ts-lib': { language: 'ts', target: ['library'], moduleFormat: 'dual' },
  'js-lib': { language: 'js', target: ['library'], moduleFormat: 'dual', bundler: 'tsup' },
  'ts-cli': { language: 'ts', target: ['cli', 'library'], moduleFormat: 'esm' },
  cli: { language: 'ts', target: ['cli', 'library'], moduleFormat: 'esm' },
  'react-lib': { language: 'ts', framework: 'react', target: ['library'], moduleFormat: 'dual', test: 'vitest' },
  'react-lib-js': { language: 'js', framework: 'react', target: ['library'], moduleFormat: 'dual', bundler: 'tsup', test: 'vitest' },
  oss: {
    language: 'ts', target: ['library'], moduleFormat: 'dual', bundler: 'tsup',
    test: 'vitest', coverage: true, lint: 'eslint-prettier', gitHooks: 'simple-git-hooks',
    release: 'changesets', workflows: ['ci', 'npm-publish', 'codeql', 'codecov'],
    deps: 'renovate', community: true, agents: true, vscode: true,
  },
  minimal: {
    language: 'ts', target: ['library'], moduleFormat: 'dual', bundler: 'tsup',
    test: 'none', lint: 'none', gitHooks: 'none', release: 'none',
    workflows: ['ci'], deps: 'none', community: false, agents: false, vscode: false,
  },
  full: {
    language: 'ts', target: ['library', 'cli'], moduleFormat: 'dual', bundler: 'tsup',
    test: 'vitest', coverage: true, lint: 'eslint-prettier', gitHooks: 'simple-git-hooks',
    release: 'changesets',
    workflows: ['ci', 'npm-publish', 'pages', 'codeql', 'codecov', 'stale'],
    deps: 'renovate', community: true, agents: true, vscode: true,
  },
};

export const PRESET_NAMES = Object.keys(PRESETS);
