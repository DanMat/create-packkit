import { toJson } from '../render.js';

export default {
  id: 'test',
  active: (cfg) => cfg.test !== 'none',
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {}, devDependencies: {} };
    const ext = cfg.ext;

    if (cfg.test === 'vitest') {
      files[`vitest.config.${ext}`] = [
        `import { defineConfig } from 'vitest/config';`,
        ``,
        `export default defineConfig({`,
        `\ttest: {`,
        cfg.coverage ? `\t\tcoverage: { provider: 'v8', reporter: ['text', 'lcov'] },` : null,
        `\t},`,
        `});`,
        ``,
      ].filter((l) => l !== null).join('\n');
      pkg.scripts.test = 'vitest run';
      pkg.scripts['test:watch'] = 'vitest';
      pkg.devDependencies.vitest = '^2.0.0';
      if (cfg.coverage) {
        pkg.scripts.coverage = 'vitest run --coverage';
        pkg.devDependencies['@vitest/coverage-v8'] = '^2.0.0';
      }
      files[`src/index.test.${ext}`] = exampleTest('vitest', cfg);
    } else if (cfg.test === 'jest') {
      files['jest.config.js'] = jestConfig(cfg);
      pkg.scripts.test = 'jest';
      pkg.scripts['test:watch'] = 'jest --watch';
      pkg.devDependencies.jest = '^29.0.0';
      if (cfg.isTs) {
        pkg.devDependencies['ts-jest'] = '^29.0.0';
        pkg.devDependencies['@types/jest'] = '^29.0.0';
      }
      if (cfg.coverage) pkg.scripts.coverage = 'jest --coverage';
      files[`src/index.test.${ext}`] = exampleTest('jest', cfg);
    } else if (cfg.test === 'node') {
      pkg.scripts.test = cfg.isTs ? 'node --import tsx --test "src/**/*.test.ts"' : 'node --test';
      if (cfg.isTs) pkg.devDependencies.tsx = '^4.0.0';
      files[`src/index.test.${ext}`] = exampleTest('node', cfg);
    }

    return { files, pkg };
  },
};

function importPath(runner, cfg) {
  if (!cfg.isTs) return './index.js';
  if (runner === 'node') return './index.ts';
  return './index.js';
}

function exampleTest(runner, cfg) {
  const imp = importPath(runner, cfg);
  if (runner === 'node') {
    return [
      `import { test } from 'node:test';`,
      `import assert from 'node:assert/strict';`,
      `import { greet } from '${imp}';`,
      ``,
      `test('greet', () => {`,
      `\tassert.equal(greet('world'), 'Hello, world!');`,
      `});`,
      ``,
    ].join('\n');
  }
  const api = runner === 'jest' ? `` : `import { describe, it, expect } from 'vitest';\n`;
  const expectApi = runner === 'jest' ? '' : '';
  return [
    api + `import { greet } from '${imp}';`,
    ``,
    `describe('greet', () => {`,
    `\tit('greets by name', () => {`,
    `\t\texpect(greet('world')).toBe('Hello, world!');`,
    `\t});`,
    `});`,
    ``,
  ].join('\n');
}

function jestConfig(cfg) {
  if (cfg.isTs) {
    return [
      `/** @type {import('jest').Config} */`,
      `export default {`,
      `\tpreset: 'ts-jest/presets/default-esm',`,
      `\ttestEnvironment: 'node',`,
      `\textensionsToTreatAsEsm: ['.ts'],`,
      `};`,
      ``,
    ].join('\n');
  }
  return [
    `/** @type {import('jest').Config} */`,
    `export default {`,
    `\ttestEnvironment: 'node',`,
    `};`,
    ``,
  ].join('\n');
}
