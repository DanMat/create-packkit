import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeProject, existingEntries, dirIsEmptyOrMissing, writeLockfile } from '../src/cli/write.js';
import { generate, fromPreset } from '../src/core/index.js';

const tmp = () => mkdtemp(join(tmpdir(), 'packkit-'));

test('a directory holding only .git counts as empty', async () => {
  // The create-repo → clone → scaffold flow leaves a bare .git behind, and
  // treating that as "not empty" used to abort the most common way in.
  const dir = await tmp();
  await mkdir(join(dir, '.git'));
  await writeFile(join(dir, '.DS_Store'), '');
  assert.deepEqual(existingEntries(dir), []);
  assert.equal(dirIsEmptyOrMissing(dir), true);
});

test('real files make a directory non-empty', async () => {
  const dir = await tmp();
  await mkdir(join(dir, '.git'));
  await writeFile(join(dir, 'README.md'), 'mine');
  assert.deepEqual(existingEntries(dir), ['README.md']);
  assert.equal(dirIsEmptyOrMissing(dir), false);
});

test('missing directory is empty', async () => {
  assert.equal(dirIsEmptyOrMissing(join(await tmp(), 'nope')), true);
});

test('merge never overwrites, and reports what it kept', async () => {
  const dir = await tmp();
  await writeFile(join(dir, 'README.md'), 'ORIGINAL');
  await mkdir(join(dir, 'src'));
  await writeFile(join(dir, 'src/index.ts'), 'export const mine = 1;');

  const { written, skipped } = await writeProject(
    dir,
    { 'README.md': 'generated', 'src/index.ts': 'generated', 'tsconfig.json': '{}' },
    { merge: true },
  );

  assert.deepEqual(skipped.sort(), ['README.md', 'src/index.ts']);
  assert.deepEqual(written, ['tsconfig.json']);
  assert.equal(await readFile(join(dir, 'README.md'), 'utf8'), 'ORIGINAL');
  assert.equal(await readFile(join(dir, 'src/index.ts'), 'utf8'), 'export const mine = 1;');
  assert.equal(await readFile(join(dir, 'tsconfig.json'), 'utf8'), '{}');
});

test('writeLockfile reports failure for package managers without a lockfile-only mode', async () => {
  // Yarn has no mode that works across its v1/v2+ split, so the caller has to
  // warn rather than silently push a repo whose first CI run will fail.
  assert.equal(writeLockfile('yarn', await tmp()), false);
});

test('without merge every file is written, nested dirs created', async () => {
  const dir = await tmp();
  const { written, skipped } = await writeProject(dir, { 'a/b/c.txt': 'hi', 'd.txt': 'yo' });
  assert.deepEqual(skipped, []);
  assert.equal(written.length, 2);
  assert.equal(await readFile(join(dir, 'a/b/c.txt'), 'utf8'), 'hi');
});

test('README documents the npm credential requirement when a publish workflow is included', () => {
  const out = generate(fromPreset('ts-lib', { name: 'r1' }));
  const readme = out.files['README.md'];
  assert.match(readme, /## Releasing/);
  assert.match(readme, /Trusted Publishing/);
  assert.match(readme, /ENEEDAUTH/, 'names the exact error the user will see');
});

test('README omits the releasing section when nothing publishes', () => {
  const out = generate(fromPreset('react-app', { name: 'r2' }));
  assert.doesNotMatch(out.files['README.md'], /## Releasing/);
});
