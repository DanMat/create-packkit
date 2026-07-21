// packkit.json — what this project was generated from.
//
// Packkit used to leave no trace, so a project couldn't answer "what did I
// start from?", couldn't be diffed against a newer template, and had no upgrade
// path. This records the answer next to the code.
//
// Only settings that differ from the defaults are stored, so the file reads as
// the decisions someone actually made rather than a dump of every option. It is
// deliberately free of timestamps and machine details: generation stays a pure
// function of the config, so the same config always produces the same bytes.

import { toJson } from './render.js';
import { defaultConfig } from './options.js';

// How this particular run was invoked, rather than what the project is.
// Replaying a config shouldn't re-run someone else's `git init` or install.
const TRANSIENT = new Set(['gitInit', 'install', 'generatorVersion', 'preset', 'name']);

export function provenance(cfg) {
  const defaults = defaultConfig();
  const settings = {};
  for (const [key, value] of Object.entries(cfg)) {
    // Skip derived helpers (isTs, hasApp, ext…) — they aren't inputs.
    if (!(key in defaults) || TRANSIENT.has(key)) continue;
    if (JSON.stringify(value) !== JSON.stringify(defaults[key])) settings[key] = value;
  }

  return toJson({
    $schema: 'https://danmat.github.io/create-packkit/packkit.schema.json',
    generator: 'create-packkit',
    ...(cfg.generatorVersion ? { version: cfg.generatorVersion } : {}),
    ...(cfg.preset ? { preset: cfg.preset } : {}),
    settings,
  });
}
