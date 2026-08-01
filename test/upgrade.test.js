import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planUpgrade, isUpgradeEmpty, buildUpgradeWrite, createProject } from '../src/embedded/index.js';

const pkg = (obj) => JSON.stringify(obj, null, 2) + '\n';

test('planUpgrade classifies new / changed / unchanged files', () => {
  const generated = { 'a.txt': 'A', 'b.txt': 'B', 'c.txt': 'C' };
  const onDisk = { 'a.txt': 'A', 'b.txt': 'edited', 'c.txt': undefined };
  const plan = planUpgrade({ generated, onDisk });
  assert.deepEqual(plan.files.added, ['c.txt']);
  assert.deepEqual(plan.files.changed, ['b.txt']);
  assert.deepEqual(plan.files.unchanged, ['a.txt']);
});

test('package.json diff: added vs changed, split by dependency section', () => {
  const generated = {
    'package.json': pkg({
      dependencies: { hono: '^4.5.0' },
      devDependencies: { tsup: '^8.0.0', vitest: '^4.0.0' },
      peerDependencies: { react: '>=18' },
      scripts: { build: 'tsup', test: 'vitest' },
    }),
  };
  const onDisk = {
    'package.json': pkg({
      dependencies: { hono: '^4.0.0', 'my-lib': '^1.0.0' },
      devDependencies: { tsup: '^8.0.0' },
      peerDependencies: {},
      scripts: { build: 'my-custom-build', deploy: 'mine' },
    }),
  };
  const p = planUpgrade({ generated, onDisk }).packageJson;

  // added lands in the right section
  assert.deepEqual(p.addedDependencies.devDependencies.vitest, { generated: '^4.0.0' });
  assert.deepEqual(p.addedDependencies.peerDependencies.react, { generated: '>=18' });
  // changed carries current + generated
  assert.deepEqual(p.changedDependencies.dependencies.hono, { current: '^4.0.0', generated: '^4.5.0' });
  // scripts
  assert.equal(p.addedScripts.test, 'vitest');
  assert.deepEqual(p.changedScripts.build, { current: 'my-custom-build', generated: 'tsup' });
  // the user's own dep/script are not reported as removed
  assert.equal(p.addedDependencies.dependencies['my-lib'], undefined);
  assert.equal(p.changedScripts.deploy, undefined);
});

test('same dependency name in different sections stays distinct', () => {
  const generated = { 'package.json': pkg({ dependencies: { react: '^19.0.0' }, peerDependencies: { react: '>=19' } }) };
  const onDisk = { 'package.json': pkg({ dependencies: { react: '^18.0.0' }, peerDependencies: { react: '>=18' } }) };
  const p = planUpgrade({ generated, onDisk }).packageJson;
  assert.deepEqual(p.changedDependencies.dependencies.react, { current: '^18.0.0', generated: '^19.0.0' });
  assert.deepEqual(p.changedDependencies.peerDependencies.react, { current: '>=18', generated: '>=19' });
});

test('protected package fields: added vs changed', () => {
  const generated = { 'package.json': pkg({ main: './dist/index.js', exports: { '.': './dist/index.js' }, engines: { node: '>=24' } }) };
  const onDisk = { 'package.json': pkg({ main: './dist/index.js', engines: { node: '>=20' } }) };
  const p = planUpgrade({ generated, onDisk }).packageJson;
  assert.deepEqual(p.addedFields.map((f) => f.field), ['exports']);
  assert.deepEqual(p.changedFields.map((f) => f.field), ['engines']);
});

test('isUpgradeEmpty is true only when nothing drifted', () => {
  const files = { 'a.txt': 'A', 'package.json': pkg({}), 'packkit.json': '{}' };
  assert.equal(isUpgradeEmpty(planUpgrade({ generated: files, onDisk: files })), true);
  assert.equal(isUpgradeEmpty(planUpgrade({ generated: files, onDisk: { ...files, 'a.txt': 'edited' } })), false);
});

// ---- the safety contract: default is non-destructive -----------------------

const scenario = () => {
  const generated = {
    'new.txt': 'fresh',
    'edited.txt': 'packkit version',
    'package.json': pkg({
      dependencies: { hono: '^4.5.0' },
      devDependencies: { tsup: '^8.0.0', typescript: '^5.9.3' },
      scripts: { build: 'tsup', test: 'vitest' },
    }),
    'packkit.json': pkg({ version: '3.2.0' }),
  };
  const onDisk = {
    'new.txt': undefined,
    'edited.txt': 'user edited',
    'package.json': pkg({
      dependencies: { hono: '^4.5.0' },
      devDependencies: { tsup: '^8.0.0', typescript: '5.8.0' }, // user pinned an older TS
      scripts: { build: 'custom-company-build', mine: 'x' }, // user changed build, added mine
    }),
    'packkit.json': pkg({ version: '3.0.0' }),
  };
  return { generated, onDisk, plan: planUpgrade({ generated, onDisk }) };
};

test('default apply: adds new, preserves every differing value', () => {
  const { generated, onDisk, plan } = scenario();
  const write = buildUpgradeWrite({ generated, onDisk, plan }); // default policy

  assert.equal(write['new.txt'], 'fresh', 'new file added');
  assert.equal(write['edited.txt'], undefined, 'changed file preserved (not written)');
  assert.equal(write['packkit.json'], generated['packkit.json'], 'provenance refreshed');

  const merged = JSON.parse(write['package.json']);
  assert.equal(merged.scripts.test, 'vitest', 'new script added');
  assert.equal(merged.scripts.build, 'custom-company-build', 'changed script PRESERVED');
  assert.equal(merged.scripts.mine, 'x', 'user script preserved');
  assert.equal(merged.devDependencies.typescript, '5.8.0', 'changed dep version PRESERVED');
});

test('explicit policy replaces changed scripts / deps only when asked', () => {
  const { generated, onDisk, plan } = scenario();

  const scripts = JSON.parse(buildUpgradeWrite({ generated, onDisk, plan, policy: { scripts: 'replace-changed' } })['package.json']);
  assert.equal(scripts.scripts.build, 'tsup', 'changed script replaced under policy');
  assert.equal(scripts.devDependencies.typescript, '5.8.0', 'dep still preserved (scripts-only policy)');

  const deps = JSON.parse(buildUpgradeWrite({ generated, onDisk, plan, policy: { dependencies: 'replace-changed' } })['package.json']);
  assert.equal(deps.devDependencies.typescript, '^5.9.3', 'changed dep replaced under policy');
  assert.equal(deps.scripts.build, 'custom-company-build', 'script still preserved (deps-only policy)');
});

test('files policy: changed file replaced only under replace-changed', () => {
  const { generated, onDisk, plan } = scenario();
  assert.equal(buildUpgradeWrite({ generated, onDisk, plan })['edited.txt'], undefined);
  assert.equal(buildUpgradeWrite({ generated, onDisk, plan, policy: { files: 'replace-changed' } })['edited.txt'], 'packkit version');
});

test('package.json is not rewritten when there is nothing additive to apply', () => {
  const generated = { 'package.json': pkg({ devDependencies: { tsup: '^8.0.0' } }) };
  const onDisk = { 'package.json': pkg({ devDependencies: { tsup: '^7.0.0' } }) }; // only a *changed* dep
  const write = buildUpgradeWrite({ generated, onDisk, plan: planUpgrade({ generated, onDisk }) });
  assert.equal(write['package.json'], undefined, 'no additive change → package.json untouched');
});

test('end-to-end: regenerate from packkit.json reproduces the project (nothing to upgrade)', () => {
  const project = createProject({ preset: 'ts-lib', name: 'lib' });
  const provenance = JSON.parse(project.files['packkit.json']);
  const rebuilt = createProject({ preset: provenance.preset, name: 'lib', config: provenance.settings });
  const plan = planUpgrade({ generated: rebuilt.files, onDisk: project.files });
  assert.equal(isUpgradeEmpty(plan), true);
});

// ---- upgradeProject (embedded orchestration) -------------------------------

import { upgradeProject, exportProjectDefinition, summarizeUpgrade } from '../src/embedded/index.js';

test('upgradeProject: recreates, diffs, and builds a patch — purely in memory', () => {
  const project = createProject({ preset: 'ts-lib', name: 'lib' });
  const definition = exportProjectDefinition(project);
  // simulate a repo missing one generated file and with an edited README
  const currentFiles = { ...project.files };
  delete currentFiles['.editorconfig'];
  currentFiles['README.md'] = 'my edited readme\n';

  const result = upgradeProject({ definition, currentFiles });
  assert.ok(result.generatedProject.files['package.json']);
  assert.equal(result.patch['.editorconfig'], project.files['.editorconfig'], 'missing file in the patch');
  assert.equal(result.patch['README.md'], undefined, 'edited file preserved (default policy)');
  assert.equal(result.metadata.baselineAvailable, false);
  assert.ok(result.diagnostics.some((d) => d.code === 'UPGRADE_BASELINE_UNAVAILABLE'));
  assert.equal(result.metadata.hasSafeChanges, true);
});

test('upgradeProject: an up-to-date repo yields an empty patch', () => {
  const project = createProject({ preset: 'node-service', name: 'svc' });
  const result = upgradeProject({ definition: exportProjectDefinition(project), currentFiles: project.files });
  assert.deepEqual(result.patch, {});
  assert.equal(result.metadata.hasSafeChanges, false);
});

test('upgradeProject: requires currentFiles', () => {
  const project = createProject({ preset: 'ts-lib', name: 'lib' });
  assert.throws(() => upgradeProject({ definition: exportProjectDefinition(project) }), /currentFiles/);
});

test('summarizeUpgrade counts additive vs review changes', () => {
  const generated = { 'a.txt': 'A', 'b.txt': 'B', 'package.json': pkg({ scripts: { test: 'vitest' } }) };
  const onDisk = { 'a.txt': undefined, 'b.txt': 'edited', 'package.json': pkg({ scripts: {} }) };
  const s = summarizeUpgrade(planUpgrade({ generated, onDisk }));
  assert.equal(s.safeChanges, 2); // a.txt added + test script added
  assert.equal(s.reviewChanges, 1); // b.txt changed
  assert.equal(s.conflicts, 0);
});
