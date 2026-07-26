import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createProject,
  extendProject,
  exportProjectDefinition,
  createProjectFromDefinition,
  calculateProjectDigest,
  deriveDeploymentContract,
  PackkitValidationError,
  SCHEMA_VERSION,
} from '../src/embedded/index.js';
import { writeGeneratedProject, PackkitWriteError } from '../src/embedded/writer.js';
import { validateRelativePath } from '../src/embedded/paths.js';

const tmp = () => mkdtemp(join(tmpdir(), 'pk-embed-'));

// ---- createProject ---------------------------------------------------------

test('createProject: generates in memory with no side effects', () => {
  const p = createProject({ preset: 'react-app', name: 'app' });
  assert.ok(p.files['package.json']);
  assert.equal(p.summary.fileCount, Object.keys(p.files).length);
  assert.equal(p.metadata.preset, 'react-app');
  assert.equal(p.metadata.schemaVersion, SCHEMA_VERSION);
  assert.ok(p.metadata.packkitVersion);
  // deterministic: no timestamp baked in unless asked
  assert.equal(p.metadata.generatedAt, undefined);
});

test('createProject: overrides apply after the preset', () => {
  const p = createProject({ preset: 'ts-lib', name: 'x', overrides: { packageManager: 'pnpm' } });
  assert.equal(p.config.packageManager, 'pnpm');
});

test('createProject: reports normalization changes instead of applying them silently', () => {
  const p = createProject({ preset: 'node-service', name: 'svc', overrides: { storybook: true } });
  const d = p.diagnostics.find((x) => x.code === 'STORYBOOK_REQUIRES_COMPONENT_LIBRARY');
  assert.ok(d, 'storybook coercion reported');
  assert.equal(d.previousValue, true);
  assert.equal(d.resolvedValue, false);
  assert.equal(d.severity, 'warning');
});

test('createProject: unknown options are a warning, not fatal', () => {
  const p = createProject({ name: 'x', config: { madeUpOption: 1 } });
  assert.ok(p.diagnostics.some((d) => d.code === 'UNKNOWN_OPTION' && d.field === 'madeUpOption'));
});

test('createProject: an out-of-range value is fatal', () => {
  assert.throws(
    () => createProject({ name: 'x', config: { language: 'cobol' } }),
    (e) => e instanceof PackkitValidationError && e.diagnostics[0].code === 'VALUE_NOT_ALLOWED',
  );
});

test('createProject: an unknown preset is fatal', () => {
  assert.throws(
    () => createProject({ preset: 'does-not-exist', name: 'x' }),
    (e) => e instanceof PackkitValidationError && e.diagnostics[0].code === 'UNKNOWN_PRESET',
  );
});

// ---- extendProject ---------------------------------------------------------

test('extendProject: adds files and never mutates the original', () => {
  const base = createProject({ preset: 'ts-lib', name: 'lib' });
  const beforeCount = Object.keys(base.files).length;
  const ext = extendProject(base, { files: { '.github/workflows/deploy.yml': 'name: deploy\n' } });
  assert.equal(Object.keys(base.files).length, beforeCount, 'base unchanged');
  assert.equal(ext.files['.github/workflows/deploy.yml'], 'name: deploy\n');
  assert.equal(ext.summary.fileCount, beforeCount + 1);
});

test('extendProject: default collision policy is error', () => {
  const base = createProject({ preset: 'ts-lib', name: 'lib' });
  assert.throws(
    () => extendProject(base, { files: { 'package.json': '{}' } }),
    (e) => e instanceof PackkitValidationError && e.diagnostics[0].code === 'EXTENSION_FILE_COLLISION',
  );
});

test('extendProject: skip keeps the generated file; overwrite replaces it', () => {
  const base = createProject({ preset: 'ts-lib', name: 'lib' });
  const original = base.files['package.json'];
  const skipped = extendProject(base, { files: { 'package.json': 'REPLACED' }, collisionPolicy: 'skip' });
  assert.equal(skipped.files['package.json'], original);
  const overwritten = extendProject(base, { files: { 'package.json': 'REPLACED' }, collisionPolicy: 'overwrite' });
  assert.equal(overwritten.files['package.json'], 'REPLACED');
});

test('extendProject: rejects a traversal path in an extension', () => {
  const base = createProject({ preset: 'ts-lib', name: 'lib' });
  assert.throws(
    () => extendProject(base, { files: { '../escape.txt': 'x' } }),
    (e) => e instanceof PackkitValidationError && e.diagnostics[0].code === 'PATH_ESCAPE',
  );
});

test('extendProject: package.json overrides deep-merge, host wins', () => {
  const base = createProject({ preset: 'node-service', name: 'svc' });
  const ext = extendProject(base, { packageJson: { scripts: { deploy: 'do-it' } } });
  const pkg = JSON.parse(ext.files['package.json']);
  assert.equal(pkg.scripts.deploy, 'do-it');
  assert.ok(pkg.scripts.start, 'existing scripts preserved');
});

// ---- path validation -------------------------------------------------------

test('validateRelativePath: rejects the classic escapes', () => {
  for (const bad of ['../outside.txt', '/etc/passwd', 'C:\\outside.txt', 'src/../../outside.txt', '', 'a\0b']) {
    assert.equal(validateRelativePath(bad).ok, false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('validateRelativePath: accepts normal nested paths', () => {
  const r = validateRelativePath('src/a/b/c.ts');
  assert.equal(r.ok, true);
  assert.equal(r.normalized, 'src/a/b/c.ts');
});

// ---- definition + digest ---------------------------------------------------

test('exportProjectDefinition + createProjectFromDefinition reproduce the same digest', () => {
  const project = createProject({ preset: 'react-app', name: 'example-app' });
  const extended = extendProject(project, { files: { '.github/workflows/deploy.yml': 'name: deploy\n' } });
  const definition = exportProjectDefinition(extended);
  assert.equal(definition.schemaVersion, SCHEMA_VERSION);
  const recreated = createProjectFromDefinition(definition);
  assert.equal(calculateProjectDigest(extended), calculateProjectDigest(recreated));
});

test('definition carries no absolute paths or secrets, only config + extensions', () => {
  const p = extendProject(createProject({ preset: 'ts-lib', name: 'lib' }), { files: { 'x.txt': 'hi' } });
  const def = exportProjectDefinition(p);
  const json = JSON.stringify(def);
  assert.doesNotMatch(json, /\/(Users|home|tmp|var)\//, 'no machine paths');
  assert.equal(def.extensions.files['x.txt'], 'hi');
});

test('a definition from an incompatible schema version is rejected', () => {
  assert.throws(
    () => createProjectFromDefinition({ schemaVersion: 999, packkitVersion: '9.9.9', config: {} }),
    (e) => e instanceof PackkitValidationError && e.diagnostics[0].code === 'SCHEMA_VERSION_MISMATCH',
  );
});

test('calculateProjectDigest is stable across repeated generation', () => {
  const a = createProject({ preset: 'node-service', name: 'svc' });
  const b = createProject({ preset: 'node-service', name: 'svc' });
  assert.equal(calculateProjectDigest(a), calculateProjectDigest(b));
});

// ---- deployment contract ---------------------------------------------------

test('deriveDeploymentContract: shape per target, provider-neutral', () => {
  const svc = createProject({ preset: 'node-service', name: 'svc' }).deploymentContract;
  assert.equal(svc.type, 'node-service');
  assert.equal(svc.port, 3000);
  assert.equal(svc.healthCheckPath, '/health');

  const app = createProject({ preset: 'react-app', name: 'app' }).deploymentContract;
  assert.deepEqual(app, { type: 'static', buildCommand: 'npm run build', outputDirectory: 'dist' });

  const lib = createProject({ preset: 'ts-lib', name: 'lib' }).deploymentContract;
  assert.equal(lib.type, 'library');

  // No provider-specific fields leak in.
  const json = JSON.stringify([svc, app, lib]);
  assert.doesNotMatch(json, /vercel|netlify|aws|cloudflare|github/i);
});

// ---- writer (filesystem) ---------------------------------------------------

test('writeGeneratedProject: writes to an empty dir, nested paths included', async () => {
  const dir = await tmp();
  const p = createProject({ preset: 'ts-lib', name: 'lib' });
  const res = await writeGeneratedProject({ project: p, destination: dir });
  assert.equal(res.writtenFiles.length, Object.keys(p.files).length);
  assert.ok((await stat(join(dir, 'package.json'))).isFile());
  assert.equal(await readFile(join(dir, 'package.json'), 'utf8'), p.files['package.json']);
});

test('writeGeneratedProject: refuses a traversal path at the boundary, writes nothing', async () => {
  const dir = await tmp();
  await assert.rejects(
    () => writeGeneratedProject({ project: { config: {}, files: { '../evil.txt': 'x', 'ok.txt': 'y' } }, destination: dir }),
    (e) => e instanceof PackkitWriteError && e.code === 'PATH_ESCAPE',
  );
  await assert.rejects(() => stat(join(dir, 'ok.txt')), 'nothing was written');
});

test('writeGeneratedProject: collision policies', async () => {
  const dir = await tmp();
  await writeFile(join(dir, 'keep.txt'), 'original');
  const project = { config: {}, files: { 'keep.txt': 'new', 'fresh.txt': 'new' } };

  await assert.rejects(
    () => writeGeneratedProject({ project, destination: dir, collisionPolicy: 'error' }),
    (e) => e instanceof PackkitWriteError && e.code === 'FILE_EXISTS',
  );

  const skip = await writeGeneratedProject({ project, destination: dir, collisionPolicy: 'skip' });
  assert.deepEqual(skip.skippedFiles, ['keep.txt']);
  assert.equal(await readFile(join(dir, 'keep.txt'), 'utf8'), 'original');
});

test('writeGeneratedProject: filenames with spaces and Unicode', async () => {
  const dir = await tmp();
  const project = { config: {}, files: { 'a folder/rΓⁿ file 日本.txt': 'ok' } };
  const res = await writeGeneratedProject({ project, destination: dir });
  assert.equal(res.writtenFiles.length, 1);
  assert.equal(await readFile(join(dir, 'a folder/rΓⁿ file 日本.txt'), 'utf8'), 'ok');
});

test('writeGeneratedProject: does not install, init git, or run commands', async () => {
  const dir = await tmp();
  const p = createProject({ preset: 'node-service', name: 'svc' });
  await writeGeneratedProject({ project: p, destination: dir });
  await assert.rejects(() => stat(join(dir, 'node_modules')), 'no install');
  await assert.rejects(() => stat(join(dir, '.git')), 'no git init');
});
