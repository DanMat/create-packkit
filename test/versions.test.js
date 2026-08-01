import { test } from 'node:test';
import assert from 'node:assert/strict';
import { V, PEER } from '../src/core/versions.js';
import { createProject } from '../src/embedded/index.js';
import { PRESET_NAMES } from '../src/core/index.js';

// Every dependency version Packkit writes must come from the catalog
// (src/core/versions.js). This binds the catalog to reality: a literal that
// drifts out of a feature module, or a dep at a spec the catalog doesn't list,
// fails here — so the catalog stays the single source of truth even for any
// version still written inline.

const MATRIX = (() => {
  const toggles = [{}, { storybook: true }, { knip: true }, { jsr: true }, { pkgChecks: true }, { sizeLimit: true }, { e2e: true }, { env: true }, { canary: true }, { doctor: true }, { minify: true }];
  const bundlers = ['tsup', 'tsdown', 'unbuild', 'rollup', 'none'];
  const tests = ['vitest', 'jest', 'node', 'none'];
  const linters = ['eslint-prettier', 'biome', 'oxlint', 'none'];
  const hooks = ['simple-git-hooks', 'husky', 'lefthook', 'none'];
  const servers = ['hono', 'fastify', 'express'];
  const configs = [];
  for (const preset of PRESET_NAMES) {
    for (const t of toggles) for (const bundler of bundlers) for (const test of tests) {
      configs.push({ preset, overrides: { ...t, bundler, test } });
    }
    for (const lint of linters) for (const gitHooks of hooks) configs.push({ preset, overrides: { lint, gitHooks } });
  }
  for (const serviceFramework of servers) for (const language of ['ts', 'js']) {
    configs.push({ preset: 'node-service', overrides: { serviceFramework, language, env: true } });
    // fullstack honors serviceFramework too — exercises @fastify/static and the
    // express supertest deps in the workspace server.
    configs.push({ preset: 'fullstack', overrides: { serviceFramework } });
  }
  return configs;
})();

test('every generated dependency version comes from the catalog', () => {
  const offenders = new Map(); // "name@spec" -> example
  for (const { preset, overrides } of MATRIX) {
    let project;
    try {
      project = createProject({ preset, name: 'x', overrides });
    } catch {
      continue;
    }
    for (const [path, content] of Object.entries(project.files)) {
      if (!path.endsWith('package.json')) continue;
      const pkg = JSON.parse(content);
      for (const map of ['dependencies', 'devDependencies', 'peerDependencies']) {
        for (const [name, spec] of Object.entries(pkg[map] || {})) {
          if (spec.startsWith('workspace:')) continue; // monorepo internal refs
          const known = spec === V[name] || spec === PEER[name];
          if (!known) offenders.set(`${name}@${spec}`, `${preset} ${map}`);
        }
      }
    }
  }
  assert.deepEqual(
    [...offenders.keys()],
    [],
    `these versions are not in src/core/versions.js (add them or fix the feature):\n${[...offenders].map(([k, v]) => `  ${k}  (${v})`).join('\n')}`,
  );
});
