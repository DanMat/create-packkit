import { toJson } from '../render.js';

export default {
  id: 'test',
  active: (cfg) => cfg.test !== 'none',
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {}, devDependencies: {} };
    const ext = cfg.ext;

    const testExt = cfg.isReact ? cfg.srcExt : ext;

    if (cfg.test === 'vitest') {
      const fw = cfg.isVue
        ? { imp: `import vue from '@vitejs/plugin-vue';`, call: 'vue()' }
        : cfg.isSvelte
          ? {
              imp: `import { svelte } from '@sveltejs/vite-plugin-svelte';\nimport { svelteTesting } from '@testing-library/svelte/vite';`,
              call: 'svelte(), svelteTesting()',
            }
          : null;
      files[`vitest.config.${ext}`] = [
        fw ? fw.imp : null,
        `import { defineConfig } from 'vitest/config';`,
        ``,
        `export default defineConfig({`,
        fw ? `\tplugins: [${fw.call}],` : null,
        `\ttest: {`,
        cfg.hasFramework ? `\t\tenvironment: 'jsdom',` : null,
        cfg.hasFramework ? `\t\tglobals: true,` : null,
        cfg.coverage ? `\t\tcoverage: { provider: 'v8', reporter: ['text', 'lcov'] },` : null,
        `\t},`,
        `});`,
        ``,
      ].filter((l) => l !== null).join('\n');
      pkg.scripts.test = 'vitest run';
      pkg.scripts['test:watch'] = 'vitest';
      pkg.devDependencies.vitest = '^4.0.0';
      if (cfg.hasFramework) {
        pkg.devDependencies.jsdom = '^29.0.0';
        pkg.devDependencies['@testing-library/dom'] = '^10.0.0';
        if (cfg.isReact) pkg.devDependencies['@testing-library/react'] = '^16.0.0';
        if (cfg.isVue) pkg.devDependencies['@testing-library/vue'] = '^8.1.0';
        if (cfg.isSvelte) pkg.devDependencies['@testing-library/svelte'] = '^5.2.0';
      }
      if (cfg.coverage) {
        pkg.scripts.coverage = 'vitest run --coverage';
        pkg.devDependencies['@vitest/coverage-v8'] = '^4.0.0';
      }
      files[`src/index.test.${testExt}`] = exampleTest('vitest', cfg);
    } else if (cfg.test === 'jest') {
      files['jest.config.js'] = jestConfig(cfg);
      pkg.scripts.test = 'jest';
      pkg.scripts['test:watch'] = 'jest --watch';
      pkg.devDependencies.jest = '^30.0.0';
      if (cfg.isTs) {
        pkg.devDependencies['ts-jest'] = '^29.0.0';
        pkg.devDependencies['@types/jest'] = '^30.0.0';
      }
      if (cfg.coverage) pkg.scripts.coverage = 'jest --coverage';
      files[`src/index.test.${testExt}`] = exampleTest('jest', cfg);
    } else if (cfg.test === 'node') {
      pkg.scripts.test = cfg.isTs ? 'node --import tsx --test "src/**/*.test.ts"' : 'node --test';
      if (cfg.isTs) pkg.devDependencies.tsx = '^4.0.0';
      files[`src/index.test.${testExt}`] = exampleTest('node', cfg);
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
  if (cfg.hasService) {
    const api = runner === 'jest' ? '' : `import { describe, it, expect } from 'vitest';\n`;
    return [
      api + `import { app } from './app.js';`,
      ``,
      `describe('app', () => {`,
      `\tit('responds on /', async () => {`,
      `\t\tconst res = await app.request('/');`,
      `\t\texpect(res.status).toBe(200);`,
      `\t});`,
      `});`,
      ``,
    ].join('\n');
  }
  if (cfg.hasFramework) {
    const api = runner === 'jest' ? '' : `import { describe, it, expect } from 'vitest';\n`;
    const app = cfg.hasApp;
    const label = app ? '/Hello from/' : `'Click me'`;
    let lib, importLine, renderCall;
    if (cfg.isReact) {
      lib = '@testing-library/react';
      importLine = app ? `import { App } from './App.js';` : `import { Button } from './index.js';`;
      renderCall = app ? `render(<App />)` : `render(<Button label="Click me" />)`;
    } else if (cfg.isVue) {
      lib = '@testing-library/vue';
      importLine = app ? `import App from './App.vue';` : `import { Button } from './index.js';`;
      renderCall = app ? `render(App)` : `render(Button, { props: { label: 'Click me' } })`;
    } else {
      lib = '@testing-library/svelte';
      importLine = app ? `import App from './App.svelte';` : `import Button from './Button.svelte';`;
      renderCall = app ? `render(App)` : `render(Button, { props: { label: 'Click me' } })`;
    }
    return [
      api + `import { render, screen } from '${lib}';`,
      importLine,
      ``,
      `describe('${app ? 'App' : 'Button'}', () => {`,
      `\tit('renders', () => {`,
      `\t\t${renderCall};`,
      `\t\texpect(screen.getByText(${label})).toBeDefined();`,
      `\t});`,
      `});`,
      ``,
    ].join('\n');
  }
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
      `\ttransform: {`,
      `\t\t'^.+\\\\.ts$': ['ts-jest', { useESM: true, tsconfig: { verbatimModuleSyntax: false } }],`,
      `\t},`,
      `\t// let \`./x.js\` imports resolve to the .ts source under ESM`,
      `\tmoduleNameMapper: { '^(\\\\.{1,2}/.*)\\\\.js$': '$1' },`,
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
