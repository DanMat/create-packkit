#!/usr/bin/env node
// Checks the dependency versions Packkit WRITES into generated projects against
// the latest on npm. Dependabot/Renovate can't see these (they're strings in our
// feature modules), so this is our "Dependabot for the templates". Flags any
// dependency that is a full major version behind. Exits 1 if anything is stale.

import { generate, normalizeConfig, fromPreset, PRESET_NAMES } from '../src/core/index.js';

// Ignore version-pinned-to-something-else or non-semver specifiers.
const IGNORE = new Set(['@types/node']);
const isSemverish = (v) => /^[\^~>=]*\d+\.\d+/.test(v) || /^[\^~>=]*\d+$/.test(v);
const floorMajor = (v) => parseInt(String(v).replace(/^[\^~>=v\s]+/, ''), 10);

// A spread of configs that together exercise every dependency we emit.
const CONFIGS = [
  ...PRESET_NAMES.map((p) => fromPreset(p, { name: 'x' })),
  normalizeConfig({ name: 'x', framework: 'react', target: ['library'], storybook: true }),
  normalizeConfig({ name: 'x', pkgChecks: true, knip: true, jsr: true }),
  normalizeConfig({ name: 'x', bundler: 'rollup', minify: true }),
  normalizeConfig({ name: 'x', bundler: 'tsdown' }),
  normalizeConfig({ name: 'x', bundler: 'unbuild' }),
  normalizeConfig({ name: 'x', test: 'jest' }),
  normalizeConfig({ name: 'x', gitHooks: 'husky' }),
  normalizeConfig({ name: 'x', gitHooks: 'lefthook' }),
  normalizeConfig({ name: 'x', release: 'release-it' }),
  normalizeConfig({ name: 'x', release: 'np' }),
  normalizeConfig({ name: 'x', lint: 'oxlint' }),
  normalizeConfig({ name: 'x', deps: 'dependabot' }),
];

function collectDeps() {
  const specs = new Map(); // pkg -> range (first seen)
  for (const cfg of CONFIGS) {
    const out = generate(cfg);
    for (const [path, contents] of Object.entries(out.files)) {
      if (!path.endsWith('package.json')) continue;
      const pkg = JSON.parse(contents);
      for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
        for (const [name, range] of Object.entries(pkg[field] || {})) {
          if (IGNORE.has(name) || !isSemverish(range)) continue;
          if (!specs.has(name)) specs.set(name, range);
        }
      }
    }
  }
  return specs;
}

async function latest(name) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`);
    if (!res.ok) return null;
    return (await res.json()).version;
  } catch {
    return null;
  }
}

const specs = collectDeps();
const stale = [];
const errors = [];

await Promise.all(
  [...specs].map(async ([name, range]) => {
    const v = await latest(name);
    if (!v) return void errors.push(name);
    const ours = floorMajor(range);
    const theirs = floorMajor(v);
    if (Number.isFinite(ours) && Number.isFinite(theirs) && theirs > ours) {
      stale.push({ name, range, latest: v, behind: theirs - ours });
    }
  }),
);

stale.sort((a, b) => b.behind - a.behind || a.name.localeCompare(b.name));

console.log(`Checked ${specs.size} template dependencies against npm.`);
if (errors.length) console.log(`Could not resolve: ${errors.join(', ')}`);

if (stale.length === 0) {
  console.log('\n✅ All template dependencies are within one major of the latest.');
  process.exit(0);
}

console.log(`\n⚠️  ${stale.length} template dependenc${stale.length === 1 ? 'y is' : 'ies are'} a major behind:\n`);
console.log('| dependency | template | latest | majors behind |');
console.log('|---|---|---|---|');
for (const s of stale) console.log(`| \`${s.name}\` | \`${s.range}\` | \`${s.latest}\` | ${s.behind} |`);
console.log('\nUpdate these in `src/core/features/*` (and `src/core/monorepo.js`).');
process.exit(1);
