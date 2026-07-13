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
  license: 'license',
  pm: 'packageManager',
  node: 'nodeVersion',
  author: 'author',
  description: 'description',
};

export function parseCliArgs(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      preset: { type: 'string' },
      name: { type: 'string' },
      yes: { type: 'boolean', short: 'y' },
      here: { type: 'boolean' },
      'no-install': { type: 'boolean' },
      'no-git': { type: 'boolean' },
      minify: { type: 'boolean' },
      target: { type: 'string', multiple: true },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
      ...Object.fromEntries(Object.keys(OVERRIDE_FLAGS).map((k) => [k, { type: 'string' }])),
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
  if (values.minify) overrides.minify = true;
  if (name) overrides.name = name;

  return {
    preset,
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
