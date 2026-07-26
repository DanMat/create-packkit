// Upgrade planning.
//
// A project scaffolded by Packkit records what it came from in packkit.json.
// That lets us regenerate the *current* recommended output and compare it to
// what's on disk — so a project can be told what has drifted from Packkit's
// current templates and choose what to pull in.
//
// This module is pure: it takes two file maps (freshly generated vs. on disk)
// and returns a classified plan. Reading the disk and applying the plan live in
// the CLI; keeping the decision logic here makes it testable and reusable.

import { finalizePackageJson } from '../core/pkg.js';
import { deepMerge, toJson } from '../core/render.js';

// Files Packkit owns but that get structural, not whole-file, treatment.
// package.json is co-owned (the host adds its own deps/scripts); packkit.json
// is expected to change every version (it records the generator version).
const STRUCTURAL = new Set(['package.json', 'packkit.json']);
const DEP_MAPS = ['dependencies', 'devDependencies', 'peerDependencies'];

/**
 * Classify how a freshly-generated project differs from what's on disk.
 *
 * @param {object} input
 * @param {Record<string,string>} input.generated  the current createProject().files
 * @param {Record<string,string|undefined>} input.onDisk  the on-disk content for
 *   each generated path (undefined when the file doesn't exist)
 * @returns an upgrade plan: which files are new/changed/current, and the
 *   structural package.json delta.
 */
export function planUpgrade({ generated, onDisk }) {
  const added = [];
  const changed = [];
  const unchanged = [];

  for (const [path, content] of Object.entries(generated)) {
    if (STRUCTURAL.has(path)) continue;
    const disk = onDisk[path];
    if (disk === undefined) added.push(path);
    else if (disk === content) unchanged.push(path);
    else changed.push(path);
  }

  return {
    files: {
      added: added.sort(),
      // "changed" means differs — could be a Packkit template change or the
      // user's own edit. Without a stored baseline we can't tell which, so these
      // are surfaced for review, never overwritten automatically.
      changed: changed.sort(),
      unchanged: unchanged.sort(),
    },
    packageJson: diffPackageJson(onDisk['package.json'], generated['package.json']),
    // packkit.json records the generator version, so it always "changes" on an
    // upgrade; applying the upgrade refreshes it.
    provenanceOutdated: onDisk['packkit.json'] !== generated['packkit.json'],
  };
}

/** True when a plan found nothing to bring in. */
export function isUpgradeEmpty(plan) {
  const p = plan.packageJson;
  return (
    plan.files.added.length === 0 &&
    plan.files.changed.length === 0 &&
    Object.keys(p.addedDependencies).length === 0 &&
    Object.keys(p.updatedDependencies).length === 0 &&
    Object.keys(p.addedScripts).length === 0 &&
    Object.keys(p.changedScripts).length === 0 &&
    !plan.provenanceOutdated
  );
}

/**
 * Build the { path: content } map to write for a plan. Always includes new
 * files, the refreshed package.json (deps bumped / added, scripts added or
 * updated — the user's own extras preserved), and packkit.json. Changed files
 * are included only when `includeChanged` is set (an explicit overwrite).
 */
export function buildUpgradeWrite({ generated, onDisk, plan, includeChanged = false }) {
  const out = {};
  for (const path of plan.files.added) out[path] = generated[path];
  if (includeChanged) for (const path of plan.files.changed) out[path] = generated[path];

  if (onDisk['package.json'] && generated['package.json']) {
    const merged = mergePackageJson(onDisk['package.json'], generated['package.json'], plan.packageJson);
    if (merged !== onDisk['package.json']) out['package.json'] = merged;
  }
  if (plan.provenanceOutdated && generated['packkit.json']) out['packkit.json'] = generated['packkit.json'];
  return out;
}

// Apply only the deps/scripts the plan flagged onto the on-disk package.json,
// so a bump lands but the user's own additions and field ordering survive.
function mergePackageJson(diskStr, genStr, pkgPlan) {
  const disk = JSON.parse(diskStr);
  const gen = JSON.parse(genStr);

  const patch = {};
  for (const [name, { map }] of Object.entries(pkgPlan.addedDependencies)) {
    (patch[map] ||= {})[name] = gen[map][name];
  }
  for (const [name, { map }] of Object.entries(pkgPlan.updatedDependencies)) {
    (patch[map] ||= {})[name] = gen[map][name];
  }
  const scripts = {};
  for (const name of Object.keys(pkgPlan.addedScripts)) scripts[name] = gen.scripts[name];
  for (const name of Object.keys(pkgPlan.changedScripts)) scripts[name] = gen.scripts[name];
  if (Object.keys(scripts).length) patch.scripts = scripts;

  return toJson(finalizePackageJson(deepMerge(disk, patch)));
}

// Structural package.json diff: what Packkit would add or bump, without ever
// treating the user's own extra deps/scripts as "removed".
function diffPackageJson(diskStr, genStr) {
  const empty = { addedDependencies: {}, updatedDependencies: {}, addedScripts: {}, changedScripts: {} };
  if (!diskStr || !genStr) return empty;

  let disk;
  let gen;
  try {
    disk = JSON.parse(diskStr);
    gen = JSON.parse(genStr);
  } catch {
    return empty; // a hand-broken package.json — leave it alone
  }

  const addedDependencies = {};
  const updatedDependencies = {};
  for (const map of DEP_MAPS) {
    for (const [name, version] of Object.entries(gen[map] || {})) {
      const current = disk[map]?.[name];
      if (current === undefined) addedDependencies[name] = { map, version };
      else if (current !== version) updatedDependencies[name] = { map, from: current, to: version };
    }
  }

  const addedScripts = {};
  const changedScripts = {};
  for (const [name, cmd] of Object.entries(gen.scripts || {})) {
    const current = disk.scripts?.[name];
    if (current === undefined) addedScripts[name] = cmd;
    else if (current !== cmd) changedScripts[name] = { from: current, to: cmd };
  }

  return { addedDependencies, updatedDependencies, addedScripts, changedScripts };
}
