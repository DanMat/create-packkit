import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, fromPreset, normalizeConfig } from '../src/core/index.js';

test('ts-lib: valid package.json with dual exports', () => {
  const out = generate(fromPreset('ts-lib', { name: 'x-lib' }));
  assert.ok(out.files['src/index.ts']);
  const pkg = JSON.parse(out.files['package.json']);
  assert.equal(pkg.name, 'x-lib');
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.exports['.'].import);
  assert.ok(pkg.exports['.'].require);
  assert.ok(pkg.exports['.'].types);
});

test('cli preset: adds a bin and cli entry', () => {
  const out = generate(fromPreset('cli', { name: 'y-cli' }));
  const pkg = JSON.parse(out.files['package.json']);
  assert.ok(pkg.bin && pkg.bin['y-cli']);
  assert.ok(out.files['src/cli.ts']);
});

test('full preset: workflows + community + agents present', () => {
  const out = generate(fromPreset('full', { name: 'z' }));
  assert.ok(out.files['.github/workflows/ci.yml']);
  assert.ok(out.files['.github/workflows/release.yml']);
  assert.ok(out.files['AGENTS.md']);
  assert.ok(out.files['CONTRIBUTING.md']);
  assert.ok(out.files['LICENSE']);
});

test('react-lib: JSX source, peer deps, jsdom tests', () => {
  const out = generate(fromPreset('react-lib', { name: 'rl' }));
  assert.ok(out.files['src/index.tsx'], 'tsx entry');
  assert.ok(out.files['src/index.test.tsx'], 'tsx test');
  assert.match(out.files['vitest.config.ts'], /jsdom/);
  const pkg = JSON.parse(out.files['package.json']);
  assert.equal(pkg.peerDependencies.react, '>=18');
  assert.ok(pkg.devDependencies['@types/react']);
  assert.ok(pkg.devDependencies['@testing-library/react']);
  assert.equal(JSON.parse(out.files['tsconfig.json']).compilerOptions.jsx, 'react-jsx');
});

test('minimal preset: no tooling extras', () => {
  const out = generate(fromPreset('minimal', { name: 'm' }));
  assert.equal(out.files['vitest.config.ts'], undefined);
  assert.equal(out.files['eslint.config.js'], undefined);
  assert.equal(out.files['AGENTS.md'], undefined);
});

test('js library: no tsconfig, ships src or dist', () => {
  const out = generate(normalizeConfig({ name: 'j', language: 'js', bundler: 'none' }));
  assert.equal(out.files['tsconfig.json'], undefined);
  const pkg = JSON.parse(out.files['package.json']);
  assert.ok(pkg.exports['.']);
});

test('every generated package.json parses', () => {
  for (const preset of ['ts-lib', 'js-lib', 'cli', 'minimal', 'full']) {
    const out = generate(fromPreset(preset, { name: 'p' }));
    assert.doesNotThrow(() => JSON.parse(out.files['package.json']), preset);
  }
});
