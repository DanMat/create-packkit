import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, fromPreset, PRESET_NAMES } from '../src/core/index.js';

// The config carries a lot of derived state — flat flags (isTs, hasApp,
// publishable…) and the grouped cfg.resolved view. These assert that the derived
// state is internally consistent and can never silently contradict itself, so a
// future change to normalizeConfig that introduces a contradiction fails here.

// A broad matrix of resolved configs.
function matrix() {
  const out = [];
  const langs = ['ts', 'js'];
  const modules = ['esm', 'dual', 'cjs'];
  const frameworks = ['none', 'react', 'vue', 'svelte'];
  const targetSets = [['library'], ['cli'], ['service'], ['app'], ['library', 'cli']];
  for (const preset of PRESET_NAMES) out.push(fromPreset(preset, { name: 'x' }));
  for (const language of langs)
    for (const moduleFormat of modules)
      for (const framework of frameworks)
        for (const target of targetSets) {
          out.push(normalizeConfig({ name: 'x', language, moduleFormat, framework, target }));
          out.push(normalizeConfig({ name: 'x', language, moduleFormat, framework, target, monorepo: true }));
        }
  return out;
}

test('the grouped resolved view never disagrees with the flat flags', () => {
  for (const cfg of matrix()) {
    const r = cfg.resolved;
    assert.equal(r.targets.library, cfg.hasLibrary);
    assert.equal(r.targets.cli, cfg.hasCli);
    assert.equal(r.targets.service, cfg.hasService);
    assert.equal(r.targets.app, cfg.hasApp);
    assert.equal(r.language.typescript, cfg.isTs);
    assert.equal(r.framework.any, cfg.hasFramework);
    assert.equal(r.framework.react, cfg.isReact);
    assert.equal(r.build.has, cfg.hasBuild);
    assert.equal(r.module.esm, cfg.hasEsm);
    assert.equal(r.package.publishable, cfg.publishable);
  }
});

test('derived state is internally consistent — no contradictions possible', () => {
  for (const cfg of matrix()) {
    const label = `${cfg.language} ${cfg.moduleFormat} ${cfg.framework} [${cfg.target}]${cfg.monorepo ? ' monorepo' : ''}`;
    const ok = (cond, msg) => assert.ok(cond, `${msg} — for ${label}`);

    // A target is always present.
    ok(cfg.target.length > 0, 'has at least one target');
    // Publishable is exactly libraries/CLIs that are neither an app nor a service.
    ok(cfg.publishable === ((cfg.hasLibrary || cfg.hasCli) && !cfg.hasApp && !cfg.hasService), 'publishable definition holds');
    // An app is bundled, never published, and always ESM.
    if (cfg.hasApp) {
      ok(!cfg.publishable, 'an app is not publishable');
      ok(cfg.moduleFormat === 'esm', 'an app is ESM-only');
    }
    // A service is never publishable.
    if (cfg.hasService) ok(!cfg.publishable, 'a service is not publishable');
    // Framework flags are mutually exclusive and agree with `any`.
    const fw = [cfg.isReact, cfg.isVue, cfg.isSvelte].filter(Boolean).length;
    ok(fw <= 1, 'at most one framework');
    ok(cfg.hasFramework === (fw === 1), 'hasFramework matches exactly one concrete framework');
    // Options that require a publishable package must be off when it isn't.
    if (!cfg.publishable) {
      ok(!cfg.pkgChecks, 'pkgChecks off when not publishable');
      ok(!cfg.sizeLimit, 'sizeLimit off when not publishable');
      ok(!cfg.sourcemaps, 'sourcemaps off when not publishable');
    }
    // Storybook only for a component library (framework, library, not app).
    if (cfg.storybook) ok(cfg.hasFramework && cfg.hasLibrary && !cfg.hasApp, 'storybook only on a component library');
    // E2E only for an app.
    if (cfg.e2e) ok(cfg.hasApp, 'e2e only on an app');
    // JSR only for a plain TS library.
    if (cfg.jsr) ok(cfg.isTs && cfg.hasLibrary && !cfg.hasFramework && !cfg.hasApp, 'jsr only on a plain TS library');
    // Canary only rides the changesets flow.
    if (cfg.canary) ok(cfg.release === 'changesets', 'canary requires changesets');
  }
});
