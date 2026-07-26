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

test('planUpgrade: package.json is structural — adds and bumps, never removes user deps', () => {
  const generated = {
    'package.json': pkg({ dependencies: { hono: '^4.5.0' }, devDependencies: { tsup: '^8.0.0' }, scripts: { build: 'tsup', test: 'vitest' } }),
  };
  const onDisk = {
    'package.json': pkg({ dependencies: { hono: '^4.0.0', 'my-lib': '^1.0.0' }, devDependencies: {}, scripts: { build: 'tsup', deploy: 'mine' } }),
  };
  const p = planUpgrade({ generated, onDisk }).packageJson;
  assert.deepEqual(p.updatedDependencies.hono, { map: 'dependencies', from: '^4.0.0', to: '^4.5.0' });
  assert.deepEqual(p.addedDependencies.tsup, { map: 'devDependencies', version: '^8.0.0' });
  assert.equal(p.addedScripts.test, 'vitest');
  // the user's own dep and script are not reported as removed/changed
  assert.equal(p.addedDependencies['my-lib'], undefined);
  assert.equal(p.changedScripts.deploy, undefined);
});

test('isUpgradeEmpty is true only when nothing drifted', () => {
  const files = { 'a.txt': 'A', 'package.json': pkg({}), 'packkit.json': '{}' };
  assert.equal(isUpgradeEmpty(planUpgrade({ generated: files, onDisk: files })), true);
  assert.equal(isUpgradeEmpty(planUpgrade({ generated: files, onDisk: { ...files, 'a.txt': 'edited' } })), false);
});

test('buildUpgradeWrite: new files + merged package.json, changed excluded by default', () => {
  const generated = {
    'new.txt': 'fresh',
    'edited.txt': 'packkit version',
    'package.json': pkg({ devDependencies: { tsup: '^8.0.0' }, scripts: { build: 'tsup' } }),
    'packkit.json': pkg({ version: '3.0.0' }),
  };
  const onDisk = {
    'new.txt': undefined,
    'edited.txt': 'user edited',
    'package.json': pkg({ devDependencies: { tsup: '^7.0.0' }, scripts: { build: 'tsup', mine: 'x' } }),
    'packkit.json': pkg({ version: '2.0.0' }),
  };
  const plan = planUpgrade({ generated, onDisk });

  const write = buildUpgradeWrite({ generated, onDisk, plan });
  assert.equal(write['new.txt'], 'fresh', 'new file written');
  assert.equal(write['edited.txt'], undefined, 'changed file left alone');
  assert.equal(write['packkit.json'], generated['packkit.json'], 'provenance refreshed');
  const merged = JSON.parse(write['package.json']);
  assert.equal(merged.devDependencies.tsup, '^8.0.0', 'bump applied');
  assert.equal(merged.scripts.mine, 'x', 'user script preserved');

  // --force also brings the changed file
  const forced = buildUpgradeWrite({ generated, onDisk, plan, includeChanged: true });
  assert.equal(forced['edited.txt'], 'packkit version');
});

test('end-to-end: regenerate from packkit.json reproduces the project (nothing to upgrade)', () => {
  const project = createProject({ preset: 'ts-lib', name: 'lib' });
  const provenance = JSON.parse(project.files['packkit.json']);
  const rebuilt = createProject({ preset: provenance.preset, name: 'lib', config: provenance.settings });
  // on disk == freshly generated → an empty plan
  const plan = planUpgrade({ generated: rebuilt.files, onDisk: project.files });
  assert.equal(isUpgradeEmpty(plan), true);
});
