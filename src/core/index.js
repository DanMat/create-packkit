// Packkit core — pure, dependency-free, runs in Node AND the browser.
// generate(config) -> { config, files: { path: contents }, postCommands, summary }
// The CLI writes `files` to disk; the web configurator zips them.

import { normalizeConfig, OPTIONS, GROUPS, OPTION_HELP, defaultConfig } from './options.js';
import { deepMerge, toJson } from './render.js';
import { finalizePackageJson } from './pkg.js';
import features from './features/index.js';
import { buildMonorepo } from './monorepo.js';
import { PRESETS, PRESET_NAMES, PRESET_INFO, PRESET_ALIASES, resolvePreset } from './presets.js';

export { OPTIONS, GROUPS, OPTION_HELP, defaultConfig, normalizeConfig, PRESETS, PRESET_NAMES, PRESET_INFO, PRESET_ALIASES, resolvePreset };

/** Apply a named preset (or alias) over the defaults, returning a full config. */
export function fromPreset(name, overrides = {}) {
  const canonical = resolvePreset(name);
  if (!canonical) throw new Error(`Unknown preset "${name}". Known: ${PRESET_NAMES.join(', ')}`);
  return normalizeConfig({ ...PRESETS[canonical], ...overrides });
}

/** Turn a config into a complete set of files. */
export function generate(input) {
  const cfg = normalizeConfig(input);
  if (cfg.monorepo) return buildMonorepo(cfg);

  const files = {};
  let pkg = {};

  for (const feat of features) {
    if (!feat.active(cfg)) continue;
    const out = feat.apply(cfg) || {};
    if (out.files) {
      for (const [path, contents] of Object.entries(out.files)) files[path] = contents;
    }
    if (out.pkg) pkg = deepMerge(pkg, out.pkg);
  }

  files['package.json'] = toJson(finalizePackageJson(pkg));

  return {
    config: cfg,
    files,
    postCommands: postCommands(cfg),
    summary: summarize(cfg, files),
  };
}

function postCommands(cfg) {
  const install = {
    npm: 'npm install',
    pnpm: 'pnpm install',
    yarn: 'yarn install',
    bun: 'bun install',
  }[cfg.packageManager];
  const cmds = [];
  if (cfg.gitInit) cmds.push('git init', 'git add -A', 'git commit -m "Initial commit from Packkit"');
  if (cfg.install) cmds.push(install);
  return cmds;
}

function summarize(cfg, files) {
  return {
    name: cfg.name,
    fileCount: Object.keys(files).length,
    stack: [
      cfg.isTs ? 'TypeScript' : 'JavaScript',
      cfg.moduleFormat.toUpperCase(),
      cfg.target.join('+'),
      cfg.bundler !== 'none' ? cfg.bundler : (cfg.isTs ? 'tsc' : 'no-build'),
      cfg.test !== 'none' ? cfg.test : null,
      cfg.lint !== 'none' ? cfg.lint : null,
      cfg.release !== 'none' ? cfg.release : null,
    ].filter(Boolean),
    workflows: cfg.workflows,
  };
}
