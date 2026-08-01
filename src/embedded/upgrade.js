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
//
// Safety model: without a stored baseline Packkit cannot know whether an
// existing value differs because the template moved or because the user
// customized it. So the default is conservative everywhere — additions apply,
// but anything that already exists and differs is preserved, and only replaced
// when the caller asks explicitly (per category).

import { finalizePackageJson } from '../core/pkg.js';
import { deepMerge, toJson } from '../core/render.js';

// Files Packkit owns but that get structural, not whole-file, treatment.
// package.json is co-owned (the host adds its own deps/scripts); packkit.json
// is expected to change every version (it records the generator version).
const STRUCTURAL = new Set(['package.json', 'packkit.json']);
const DEP_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
// Protected package.json fields — changing one can alter how the package is
// built, published, or resolved, so a differing value is never overwritten by
// default.
const PROTECTED_FIELDS = ['exports', 'bin', 'main', 'module', 'types', 'files', 'engines', 'packageManager'];

/** The conservative default: add what's new, preserve everything that differs. */
export const DEFAULT_UPGRADE_POLICY = Object.freeze({
  files: 'add-only',
  scripts: 'add-only',
  dependencies: 'add-only',
  packageFields: 'add-only',
});

const emptyDepMap = () => ({ dependencies: {}, devDependencies: {}, peerDependencies: {}, optionalDependencies: {} });

/**
 * Classify how a freshly-generated project differs from what's on disk.
 *
 * @param {object} input
 * @param {Record<string,string>} input.generated  the current createProject().files
 * @param {Record<string,string|undefined>} input.onDisk  the on-disk content for
 *   each generated path (undefined when the file doesn't exist)
 * @returns an upgrade plan: which files are new/changed/current, and the
 *   structural package.json delta (scripts, dependencies per section, and
 *   protected fields, split into added vs changed).
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

/**
 * Count a plan into safe (additive, applied by default), review (differs,
 * preserved by default), and conflict (both-changed; only detectable with a
 * baseline, so 0 today). Used for the metadata summary and --json output.
 */
export function summarizeUpgrade(plan) {
  const p = plan.packageJson;
  const depCount = (m) => DEP_SECTIONS.reduce((n, s) => n + Object.keys(m[s]).length, 0);
  const safeChanges =
    plan.files.added.length +
    Object.keys(p.addedScripts).length +
    depCount(p.addedDependencies) +
    p.addedFields.length;
  const reviewChanges =
    plan.files.changed.length +
    Object.keys(p.changedScripts).length +
    depCount(p.changedDependencies) +
    p.changedFields.length;
  return { safeChanges, reviewChanges, conflicts: 0 };
}

/** True when a plan found nothing to bring in. */
export function isUpgradeEmpty(plan) {
  const p = plan.packageJson;
  const depsEmpty = (m) => DEP_SECTIONS.every((s) => Object.keys(m[s]).length === 0);
  return (
    plan.files.added.length === 0 &&
    plan.files.changed.length === 0 &&
    Object.keys(p.addedScripts).length === 0 &&
    Object.keys(p.changedScripts).length === 0 &&
    depsEmpty(p.addedDependencies) &&
    depsEmpty(p.changedDependencies) &&
    p.addedFields.length === 0 &&
    p.changedFields.length === 0 &&
    !plan.provenanceOutdated
  );
}

/**
 * Build the { path: content } map to write for a plan, under an apply policy.
 *
 * @param {object} input
 * @param {Record<string,string>} input.generated
 * @param {Record<string,string|undefined>} input.onDisk
 * @param {object} input.plan  a planUpgrade() result
 * @param {object} [input.policy]  per-category 'add-only' | 'replace-changed';
 *   defaults to DEFAULT_UPGRADE_POLICY (add-only everywhere — never destructive).
 */
export function buildUpgradeWrite({ generated, onDisk, plan, policy } = {}) {
  const p = { ...DEFAULT_UPGRADE_POLICY, ...(policy || {}) };
  const out = {};

  for (const path of plan.files.added) out[path] = generated[path];
  if (p.files === 'replace-changed') for (const path of plan.files.changed) out[path] = generated[path];

  if (onDisk['package.json'] && generated['package.json']) {
    const merged = mergePackageJson(onDisk['package.json'], generated['package.json'], plan.packageJson, p);
    if (merged !== null) out['package.json'] = merged;
  }
  if (plan.provenanceOutdated && generated['packkit.json']) out['packkit.json'] = generated['packkit.json'];
  return out;
}

// Apply the package.json changes the policy permits: always add what's new,
// replace an existing differing value only under 'replace-changed'. Returns the
// serialized package.json, or null when nothing would change.
function mergePackageJson(diskStr, genStr, pkgPlan, policy) {
  let disk;
  let gen;
  try {
    disk = JSON.parse(diskStr);
    gen = JSON.parse(genStr);
  } catch {
    return null;
  }

  let touched = false;
  const patch = {};

  for (const section of DEP_SECTIONS) {
    for (const name of Object.keys(pkgPlan.addedDependencies[section])) {
      (patch[section] ||= {})[name] = gen[section][name];
      touched = true;
    }
    if (policy.dependencies === 'replace-changed') {
      for (const name of Object.keys(pkgPlan.changedDependencies[section])) {
        (patch[section] ||= {})[name] = gen[section][name];
        touched = true;
      }
    }
  }

  const scripts = {};
  for (const name of Object.keys(pkgPlan.addedScripts)) { scripts[name] = gen.scripts[name]; touched = true; }
  if (policy.scripts === 'replace-changed') {
    for (const name of Object.keys(pkgPlan.changedScripts)) { scripts[name] = gen.scripts[name]; touched = true; }
  }
  if (Object.keys(scripts).length) patch.scripts = scripts;

  let merged = deepMerge(disk, patch);

  // Protected fields are assigned whole (a merge could leave a stale nested key
  // on a replaced exports/bin map). Added fields always land; changed ones only
  // under 'replace-changed'.
  for (const { field } of pkgPlan.addedFields) { merged = { ...merged, [field]: gen[field] }; touched = true; }
  if (policy.packageFields === 'replace-changed') {
    for (const { field } of pkgPlan.changedFields) { merged = { ...merged, [field]: gen[field] }; touched = true; }
  }

  if (!touched) return null;
  return toJson(finalizePackageJson(merged));
}

// Structural package.json diff: scripts, dependencies (per section), and
// protected fields — each split into added (not on disk) vs changed (present
// but different). The user's own extras are never reported as removed.
function diffPackageJson(diskStr, genStr) {
  const empty = {
    addedScripts: {},
    changedScripts: {},
    addedDependencies: emptyDepMap(),
    changedDependencies: emptyDepMap(),
    addedFields: [],
    changedFields: [],
  };
  if (!diskStr || !genStr) return empty;

  let disk;
  let gen;
  try {
    disk = JSON.parse(diskStr);
    gen = JSON.parse(genStr);
  } catch {
    return empty; // a hand-broken package.json — leave it alone
  }

  const addedDependencies = emptyDepMap();
  const changedDependencies = emptyDepMap();
  for (const section of DEP_SECTIONS) {
    for (const [name, version] of Object.entries(gen[section] || {})) {
      const current = disk[section]?.[name];
      if (current === undefined) addedDependencies[section][name] = { generated: version };
      else if (current !== version) changedDependencies[section][name] = { current, generated: version };
    }
  }

  const addedScripts = {};
  const changedScripts = {};
  for (const [name, cmd] of Object.entries(gen.scripts || {})) {
    const current = disk.scripts?.[name];
    if (current === undefined) addedScripts[name] = cmd;
    else if (current !== cmd) changedScripts[name] = { current, generated: cmd };
  }

  const addedFields = [];
  const changedFields = [];
  for (const field of PROTECTED_FIELDS) {
    if (!(field in gen)) continue;
    if (!(field in disk)) addedFields.push({ field, generated: gen[field] });
    else if (JSON.stringify(disk[field]) !== JSON.stringify(gen[field])) {
      changedFields.push({ field, current: disk[field], generated: gen[field] });
    }
  }

  return { addedScripts, changedScripts, addedDependencies, changedDependencies, addedFields, changedFields };
}
