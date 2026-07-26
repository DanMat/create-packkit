// Embedded API — the supported entry point for a Node application that wants
// to use Packkit as a project-generation engine.
//
// Everything here is pure and side-effect free except the writer (separate
// module). No prompts, no installs, no git, no network, no command execution.
// A host calls createProject() to generate in memory, extendProject() to add
// its own deployment files, and writeGeneratedProject() when it wants disk.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import {
  generate,
  assemble,
  normalizeConfig,
  resolvePreset,
  PRESETS,
  OPTIONS,
} from '../core/index.js';
import { finalizePackageJson } from '../core/pkg.js';
import { deepMerge, toJson } from '../core/render.js';
import { validateRelativePath, validatePathMap } from './paths.js';
import { analyzePkgFragments } from './pkg-merge.js';
import { deriveDeploymentContract } from './contract.js';

export { deriveDeploymentContract };

// Bumped when the shape of PackkitProjectDefinition changes incompatibly.
export const SCHEMA_VERSION = 1;

/** Non-OPTIONS config keys the pipeline sets itself; not "unknown". */
const KNOWN_EXTRA_KEYS = new Set(['preset', 'generatorVersion']);

/** Thrown when a config cannot produce a valid project. Carries diagnostics. */
export class PackkitValidationError extends Error {
  constructor(message, diagnostics) {
    super(message);
    this.name = 'PackkitValidationError';
    this.diagnostics = diagnostics;
  }
}

let cachedVersion;
function packkitVersion() {
  if (cachedVersion) return cachedVersion;
  try {
    const url = new URL('../../package.json', import.meta.url);
    cachedVersion = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')).version;
  } catch {
    cachedVersion = '0.0.0';
  }
  return cachedVersion;
}

/**
 * Generate a complete project in memory. No files are written, nothing is
 * installed, no commands run. Returns a GeneratedProject with diagnostics.
 * Throws PackkitValidationError if the config is fatally invalid.
 */
export function createProject(input = {}) {
  if (!input || typeof input !== 'object') throw new TypeError('createProject expects an input object.');

  // Preset first, then explicit overrides, matching the CLI's precedence.
  const merged = { ...(input.config || {}), ...(input.overrides || {}) };
  if (input.name != null) merged.name = input.name;

  const preErrors = validateInput(input.preset, merged);
  if (preErrors.length) {
    throw new PackkitValidationError('The configuration is not valid; see error.diagnostics.', preErrors);
  }

  const diagnostics = [...unknownOptionDiagnostics(merged)];

  // Spread the preset under the overrides, then normalize ONCE with the
  // collector. Normalizing the raw values (rather than an already-normalized
  // seed) is what lets a coercion like "storybook off for a service" be
  // observed — a second pass would see the value already settled and stay quiet.
  let canonicalPreset;
  if (input.preset) {
    canonicalPreset = resolvePreset(input.preset);
    if (!canonicalPreset) {
      throw new PackkitValidationError(`Unknown preset "${input.preset}".`, [
        { severity: 'error', code: 'UNKNOWN_PRESET', field: 'preset', message: `Unknown preset "${input.preset}".`, source: 'validate' },
      ]);
    }
  }
  const raw = canonicalPreset ? { ...PRESETS[canonicalPreset], ...merged } : merged;
  const config = normalizeConfig({ ...raw, generatorVersion: packkitVersion() }, diagnostics);
  if (canonicalPreset) config.preset = canonicalPreset;

  // generate() is the single source of truth for the actual bytes; assemble()
  // gives us provenance to detect conflicts without changing that output.
  const { files, summary } = generate(config);
  const { fileSources, fragments } = assemble(config);
  for (const [path, sources] of Object.entries(fileSources)) {
    if (sources.length > 1) {
      diagnostics.push({
        severity: 'warning',
        code: 'FEATURE_FILE_COLLISION',
        field: path,
        message: `"${path}" was written by more than one feature (${sources.join(', ')}); the last one wins.`,
        source: 'assemble',
      });
    }
  }
  diagnostics.push(...analyzePkgFragments(fragments).diagnostics);

  return {
    config,
    files,
    summary,
    diagnostics,
    metadata: {
      packkitVersion: packkitVersion(),
      schemaVersion: SCHEMA_VERSION,
      preset: config.preset,
    },
    deploymentContract: deriveDeploymentContract(config),
    // Internal: what the host layered on, so exportProjectDefinition can replay
    // it. Not part of the documented contract.
    _extensions: { files: {}, packageJson: {} },
  };
}

/**
 * Return a NEW project with the extension's files and package.json fields
 * layered on. Never mutates `project`. Extension file paths are validated;
 * collisions with existing files follow collisionPolicy (default 'error').
 */
export function extendProject(project, extension = {}) {
  assertProject(project);
  const policy = extension.collisionPolicy || 'error';
  if (!['error', 'skip', 'overwrite'].includes(policy)) {
    throw new TypeError(`Unknown collisionPolicy "${policy}".`);
  }

  const files = { ...project.files };
  const diagnostics = [...project.diagnostics];
  const extFiles = extension.files || {};

  // Case-insensitive collisions *within* the extension are always fatal — a
  // policy can't sensibly pick a winner between two files the host meant to be
  // distinct.
  const { diagnostics: pathDiag } = validatePathMap(extFiles);
  const fatal = pathDiag.filter((d) => d.severity === 'error');
  if (fatal.length) throw new PackkitValidationError('Extension files are not valid; see error.diagnostics.', fatal);

  const appliedFiles = {};
  for (const [path, contents] of Object.entries(extFiles)) {
    const res = validateRelativePath(path);
    const target = res.normalized;
    if (target in files) {
      if (policy === 'error') {
        throw new PackkitValidationError(`Extension file "${path}" collides with a generated file.`, [
          { severity: 'error', code: 'EXTENSION_FILE_COLLISION', field: path, message: `"${path}" already exists in the generated project.`, source: 'extend' },
        ]);
      }
      if (policy === 'skip') {
        diagnostics.push({ severity: 'info', code: 'EXTENSION_FILE_SKIPPED', field: path, message: `"${path}" was kept from the generated project; the extension copy was skipped.`, source: 'extend' });
        continue;
      }
      diagnostics.push({ severity: 'info', code: 'EXTENSION_FILE_OVERWRITTEN', field: path, message: `"${path}" was replaced by the extension.`, source: 'extend' });
    }
    files[target] = contents;
    appliedFiles[target] = contents;
  }

  // package.json overrides: the host owns them, so they win on conflict, but
  // the merge is deep so a host adding one script doesn't drop the rest.
  let packageJson = project._extensions.packageJson;
  if (extension.packageJson && Object.keys(extension.packageJson).length) {
    const current = JSON.parse(files['package.json']);
    const mergedPkg = finalizePackageJson(deepMerge(current, extension.packageJson));
    files['package.json'] = toJson(mergedPkg);
    packageJson = deepMerge(packageJson, extension.packageJson);
  }

  return {
    ...project,
    files,
    diagnostics,
    summary: { ...project.summary, fileCount: Object.keys(files).length },
    metadata: { ...project.metadata, ...(extension.metadata ? { extension: extension.metadata } : {}) },
    _extensions: {
      files: { ...project._extensions.files, ...appliedFiles },
      packageJson,
    },
  };
}

/**
 * A serializable definition that reproduces this project later. Contains no
 * secrets and no absolute paths — just the config, preset, and the extension
 * material the host layered on.
 */
export function exportProjectDefinition(project) {
  assertProject(project);
  return {
    schemaVersion: SCHEMA_VERSION,
    packkitVersion: project.metadata.packkitVersion,
    preset: project.metadata.preset,
    config: serializableConfig(project.config),
    extensions: {
      files: { ...project._extensions.files },
      packageJson: { ...project._extensions.packageJson },
    },
  };
}

/** Rebuild a project from a stored definition, re-applying its extensions. */
export function createProjectFromDefinition(definition) {
  if (!definition || typeof definition !== 'object') throw new TypeError('A definition object is required.');
  if (definition.schemaVersion !== SCHEMA_VERSION) {
    throw new PackkitValidationError(
      `Definition schemaVersion ${definition.schemaVersion} is not supported by this Packkit (expected ${SCHEMA_VERSION}).`,
      [{ severity: 'error', code: 'SCHEMA_VERSION_MISMATCH', field: 'schemaVersion', message: 'Unsupported definition schema version.', source: 'definition' }],
    );
  }
  const current = packkitVersion();
  const base = createProject({ preset: definition.preset, config: definition.config });
  if (definition.packkitVersion && definition.packkitVersion !== current) {
    base.diagnostics.push({
      severity: 'warning',
      code: 'PACKKIT_VERSION_DRIFT',
      field: 'packkitVersion',
      message: `Definition was created with Packkit ${definition.packkitVersion}; this is ${current}. Output may differ.`,
      source: 'definition',
      previousValue: definition.packkitVersion,
      resolvedValue: current,
    });
  }
  const ext = definition.extensions || {};
  if ((ext.files && Object.keys(ext.files).length) || (ext.packageJson && Object.keys(ext.packageJson).length)) {
    return extendProject(base, { files: ext.files || {}, packageJson: ext.packageJson || {}, collisionPolicy: 'overwrite' });
  }
  return base;
}

/**
 * A stable digest of the project's config and file contents. Two projects with
 * the same Packkit version, config, and extensions produce the same digest;
 * nondeterministic metadata (timestamps) is deliberately excluded.
 */
export function calculateProjectDigest(project) {
  assertProject(project);
  const h = createHash('sha256');
  h.update('config\0');
  h.update(JSON.stringify(serializableConfig(project.config)));
  for (const path of Object.keys(project.files).sort()) {
    h.update(`\0file\0${path}\0`);
    h.update(project.files[path]);
  }
  return h.digest('hex');
}

// ---- internals -------------------------------------------------------------

function assertProject(project) {
  if (!project || typeof project !== 'object' || !project.files || !project.config) {
    throw new TypeError('Expected a GeneratedProject from createProject().');
  }
}

// Only the fields that were inputs — drop the derived helper flags (isTs,
// hasApp…) so the serialized config is stable and re-normalizes to itself.
function serializableConfig(config) {
  const out = {};
  for (const key of Object.keys(OPTIONS)) {
    if (config[key] !== undefined) out[key] = config[key];
  }
  if (config.preset) out.preset = config.preset;
  return sortObject(out);
}

function sortObject(obj) {
  return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

// Fatal, generation-preventing problems: bad types and out-of-range enum values.
function validateInput(preset, config) {
  const errors = [];
  if (config.name != null && (typeof config.name !== 'string' || config.name.trim() === '')) {
    errors.push({ severity: 'error', code: 'INVALID_NAME', field: 'name', message: 'name must be a non-empty string.', source: 'validate' });
  }
  for (const [key, value] of Object.entries(config)) {
    const opt = OPTIONS[key];
    if (!opt) continue; // unknown keys are a warning, handled elsewhere
    if (opt.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(valueError(key, value, 'must be true or false'));
    } else if (opt.choices) {
      const allowed = opt.choices.map((c) => c.value);
      const values = opt.type === 'multiselect' ? (Array.isArray(value) ? value : [value]) : [value];
      for (const v of values) {
        if (!allowed.includes(v)) errors.push(valueError(key, v, `must be one of: ${allowed.join(', ')}`));
      }
    }
  }
  return errors;
}

function valueError(field, value, detail) {
  return { severity: 'error', code: 'VALUE_NOT_ALLOWED', field, previousValue: value, message: `${field} ${detail}.`, source: 'validate' };
}

function unknownOptionDiagnostics(config) {
  const out = [];
  for (const key of Object.keys(config)) {
    if (OPTIONS[key] || KNOWN_EXTRA_KEYS.has(key)) continue;
    out.push({ severity: 'warning', code: 'UNKNOWN_OPTION', field: key, message: `"${key}" is not a Packkit option and was ignored.`, source: 'validate' });
  }
  return out;
}
