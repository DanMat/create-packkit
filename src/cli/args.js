import { parseArgs } from 'node:util';
import { PRESET_NAMES } from '../core/presets.js';

// Map friendly flag names to config keys for non-interactive use.
const OVERRIDE_FLAGS = {
  language: 'language',
  module: 'moduleFormat',
  framework: 'framework',
  bundler: 'bundler',
  test: 'test',
  lint: 'lint',
  hooks: 'gitHooks',
  release: 'release',
  deps: 'deps',
  license: 'license',
  pm: 'packageManager',
  node: 'nodeVersion',
  author: 'author',
  description: 'description',
};

// Boolean options that default ON — a --no-<flag> turns them off.
const NEGATABLE = {
  'no-coverage': 'coverage',
  'no-community': 'community',
  'no-agents': 'agents',
  'no-vscode': 'vscode',
  'no-editorconfig': 'editorconfig',
};

export function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      preset: { type: 'string' },
      from: { type: 'string' },
      name: { type: 'string' },
      yes: { type: 'boolean', short: 'y' },
      here: { type: 'boolean' },
      'no-install': { type: 'boolean' },
      'no-git': { type: 'boolean' },
      minify: { type: 'boolean' },
      target: { type: 'string', multiple: true },
      workflows: { type: 'string', multiple: true },
      minify: { type: 'boolean' },
      storybook: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
      ...Object.fromEntries(Object.keys(OVERRIDE_FLAGS).map((k) => [k, { type: 'string' }])),
      ...Object.fromEntries(Object.keys(NEGATABLE).map((k) => [k, { type: 'boolean' }])),
    },
  });

  // First positional may be a known preset; otherwise it's the project name.
  let preset = values.preset;
  const pos = [...positionals];
  if (!preset && pos.length && PRESET_NAMES.includes(pos[0])) preset = pos.shift();
  const name = values.name || pos[0];

  const overrides = {};
  for (const [flag, key] of Object.entries(OVERRIDE_FLAGS)) {
    if (values[flag] != null) overrides[key] = values[flag];
  }
  if (values.target) overrides.target = values.target;
  if (values.workflows) overrides.workflows = values.workflows;
  if (values.minify) overrides.minify = true;
  if (values.storybook) overrides.storybook = true;
  for (const [flag, key] of Object.entries(NEGATABLE)) {
    if (values[flag]) overrides[key] = false;
  }
  if (name) overrides.name = name;

  return {
    preset,
    from: values.from,
    name,
    here: !!values.here,
    yes: !!values.yes,
    install: !values['no-install'],
    git: !values['no-git'],
    help: !!values.help,
    version: !!values.version,
    overrides,
  };
}
