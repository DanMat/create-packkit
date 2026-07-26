import { test } from 'node:test';
import assert from 'node:assert/strict';
import features from '../src/core/features/index.js';
import { createProject } from '../src/embedded/index.js';
import { PRESET_NAMES } from '../src/core/index.js';

// Features merge their files and package.json fragments in array order, so a
// collision between two of them is "resolved" silently by position. These tests
// make that safe: every feature is uniquely identified, and no two features are
// allowed to fight over the same output across the whole config matrix — a new
// feature that collides fails here instead of shipping an order-dependent bug.

test('every feature has a unique id', () => {
  const ids = features.map((f) => f.id);
  assert.ok(
    ids.every((id) => typeof id === 'string' && id.length),
    'each feature declares a string id',
  );
  assert.equal(new Set(ids).size, ids.length, `duplicate feature ids: ${ids.join(', ')}`);
});

test('no two features collide on a file or package.json field, across the matrix', () => {
  const toggles = [
    {},
    { storybook: true },
    { knip: true },
    { jsr: true },
    { pkgChecks: true },
    { sizeLimit: true },
    { e2e: true },
    { env: true },
    { canary: true },
    { doctor: true },
    { minify: true },
  ];
  const linters = ['eslint-prettier', 'biome', 'oxlint'];
  const hooks = ['simple-git-hooks', 'husky', 'lefthook'];

  const collisions = new Set();
  for (const preset of PRESET_NAMES) {
    for (const t of toggles) {
      for (const lint of linters) {
        for (const gitHooks of hooks) {
          let project;
          try {
            project = createProject({ preset, name: 'x', overrides: { ...t, lint, gitHooks } });
          } catch {
            continue; // an invalid combination — validation covers those elsewhere
          }
          for (const d of project.diagnostics) {
            if (d.code === 'FEATURE_FILE_COLLISION' || d.code === 'PACKAGE_FIELD_CONFLICT') {
              collisions.add(`${d.code} on ${d.field} — ${d.message}`);
            }
          }
        }
      }
    }
  }
  assert.deepEqual([...collisions], [], 'features collide (ownership is order-dependent)');
});
