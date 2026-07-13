// src/core/options.js
var OPTIONS = {
  // ---- package metadata ----
  name: { group: "meta", type: "text", label: "Package name", default: "my-package" },
  description: { group: "meta", type: "text", label: "Description", default: "" },
  author: { group: "meta", type: "text", label: "Author", default: "" },
  keywords: { group: "meta", type: "text", label: "Keywords (comma-separated)", default: "" },
  repo: { group: "meta", type: "text", label: "Repository URL", default: "" },
  // ---- core shape ----
  language: {
    group: "core",
    type: "select",
    label: "Language",
    default: "ts",
    choices: [
      { value: "ts", label: "TypeScript (strict)" },
      { value: "js", label: "JavaScript (ESM)" }
    ]
  },
  moduleFormat: {
    group: "core",
    type: "select",
    label: "Module format",
    default: "dual",
    choices: [
      { value: "esm", label: "ESM only" },
      { value: "cjs", label: "CommonJS only" },
      { value: "dual", label: "Dual (ESM + CJS)" }
    ]
  },
  target: {
    group: "core",
    type: "multiselect",
    label: "What are you building?",
    default: ["library"],
    choices: [
      { value: "library", label: "Library (importable package)" },
      { value: "cli", label: "CLI tool (ships a bin)" }
    ]
  },
  packageManager: {
    group: "core",
    type: "select",
    label: "Package manager",
    default: "npm",
    choices: [
      { value: "npm", label: "npm" },
      { value: "pnpm", label: "pnpm" },
      { value: "yarn", label: "yarn" },
      { value: "bun", label: "bun" }
    ]
  },
  nodeVersion: {
    group: "core",
    type: "select",
    label: "Node version",
    default: "20",
    choices: [
      { value: "18", label: "18 (LTS)" },
      { value: "20", label: "20 (LTS)" },
      { value: "22", label: "22 (LTS)" }
    ]
  },
  // ---- build ----
  bundler: {
    group: "build",
    type: "select",
    label: "Bundler / build",
    default: "tsup",
    choices: [
      { value: "tsup", label: "tsup (esbuild \u2014 recommended)" },
      { value: "tsdown", label: "tsdown (Rolldown \u2014 fast successor)" },
      { value: "unbuild", label: "unbuild (UnJS)" },
      { value: "rollup", label: "Rollup" },
      { value: "none", label: "None (tsc / no build)" }
    ]
  },
  // ---- testing ----
  test: {
    group: "quality",
    type: "select",
    label: "Test runner",
    default: "vitest",
    choices: [
      { value: "vitest", label: "Vitest (recommended)" },
      { value: "jest", label: "Jest" },
      { value: "node", label: "node:test (built-in)" },
      { value: "none", label: "None" }
    ]
  },
  coverage: { group: "quality", type: "boolean", label: "Coverage reporting", default: true },
  // ---- lint / format ----
  lint: {
    group: "quality",
    type: "select",
    label: "Lint / format",
    default: "eslint-prettier",
    choices: [
      { value: "eslint-prettier", label: "ESLint + Prettier (recommended)" },
      { value: "biome", label: "Biome (all-in-one)" },
      { value: "oxlint", label: "oxlint + Prettier (fast)" },
      { value: "none", label: "None" }
    ]
  },
  // ---- git hooks ----
  gitHooks: {
    group: "quality",
    type: "select",
    label: "Git hooks",
    default: "simple-git-hooks",
    choices: [
      { value: "simple-git-hooks", label: "simple-git-hooks (light)" },
      { value: "husky", label: "husky + lint-staged" },
      { value: "lefthook", label: "lefthook" },
      { value: "none", label: "None" }
    ]
  },
  // ---- release ----
  release: {
    group: "release",
    type: "select",
    label: "Release / versioning",
    default: "changesets",
    choices: [
      { value: "changesets", label: "Changesets (recommended)" },
      { value: "release-it", label: "release-it" },
      { value: "np", label: "np" },
      { value: "none", label: "None" }
    ]
  },
  // ---- github actions (configurable workflows) ----
  workflows: {
    group: "ci",
    type: "multiselect",
    label: "GitHub Actions",
    default: ["ci", "npm-publish"],
    choices: [
      { value: "ci", label: "CI (typecheck + lint + test + build)" },
      { value: "npm-publish", label: "Publish to npm (provenance / OIDC)" },
      { value: "pages", label: "Deploy GitHub Pages" },
      { value: "codeql", label: "CodeQL security scan" },
      { value: "codecov", label: "Upload coverage to Codecov" },
      { value: "stale", label: "Stale issue/PR bot" }
    ]
  },
  deps: {
    group: "ci",
    type: "select",
    label: "Dependency updates",
    default: "renovate",
    choices: [
      { value: "renovate", label: "Renovate" },
      { value: "dependabot", label: "Dependabot" },
      { value: "none", label: "None" }
    ]
  },
  // ---- repo hygiene ----
  license: {
    group: "repo",
    type: "select",
    label: "License",
    default: "MIT",
    choices: [
      { value: "MIT", label: "MIT" },
      { value: "Apache-2.0", label: "Apache-2.0" },
      { value: "ISC", label: "ISC" },
      { value: "none", label: "None" }
    ]
  },
  community: { group: "repo", type: "boolean", label: "Community files (CONTRIBUTING, CoC, SECURITY, templates)", default: true },
  agents: { group: "repo", type: "boolean", label: "AI agent instructions (AGENTS.md + CLAUDE.md)", default: true },
  vscode: { group: "repo", type: "boolean", label: "VS Code settings + extensions", default: true },
  editorconfig: { group: "repo", type: "boolean", label: ".editorconfig", default: true },
  gitInit: { group: "repo", type: "boolean", label: "git init + initial commit", default: true },
  install: { group: "repo", type: "boolean", label: "Install dependencies", default: true }
};
var GROUPS = [
  { id: "meta", label: "Package" },
  { id: "core", label: "Core" },
  { id: "build", label: "Build" },
  { id: "quality", label: "Quality" },
  { id: "release", label: "Release" },
  { id: "ci", label: "CI / CD" },
  { id: "repo", label: "Repository" }
];
function defaultConfig() {
  const cfg = {};
  for (const [key, opt] of Object.entries(OPTIONS)) {
    cfg[key] = Array.isArray(opt.default) ? [...opt.default] : opt.default;
  }
  return cfg;
}
function normalizeConfig(input = {}) {
  const cfg = { ...defaultConfig(), ...input };
  if (!Array.isArray(cfg.target) || cfg.target.length === 0) cfg.target = ["library"];
  if (!Array.isArray(cfg.workflows)) cfg.workflows = [];
  if (cfg.test === "none" || cfg.test === "node") cfg.coverage = false;
  if (cfg.workflows.includes("codecov")) cfg.coverage = true;
  cfg.isTs = cfg.language === "ts";
  cfg.ext = cfg.isTs ? "ts" : "js";
  cfg.hasLibrary = cfg.target.includes("library");
  cfg.hasCli = cfg.target.includes("cli");
  cfg.hasEsm = cfg.moduleFormat === "esm" || cfg.moduleFormat === "dual";
  cfg.hasCjs = cfg.moduleFormat === "cjs" || cfg.moduleFormat === "dual";
  return cfg;
}

// src/core/render.js
function deepMerge(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    return [.../* @__PURE__ */ new Set([...target, ...source])];
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    const out = { ...target };
    for (const [k, v] of Object.entries(source)) {
      out[k] = k in target ? deepMerge(target[k], v) : v;
    }
    return out;
  }
  return source;
}
function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}
function toJson(obj) {
  return JSON.stringify(obj, null, 2) + "\n";
}

// src/core/pkg.js
var KEY_ORDER = [
  "name",
  "version",
  "description",
  "keywords",
  "homepage",
  "bugs",
  "repository",
  "license",
  "author",
  "type",
  "exports",
  "main",
  "module",
  "types",
  "bin",
  "files",
  "engines",
  "packageManager",
  "scripts",
  "simple-git-hooks",
  "lint-staged",
  "dependencies",
  "peerDependencies",
  "devDependencies",
  "publishConfig"
];
function finalizePackageJson(pkg) {
  const out = {};
  for (const key of KEY_ORDER) {
    if (pkg[key] === void 0) continue;
    out[key] = isDepMap(key) ? sortKeys(pkg[key]) : pkg[key];
  }
  for (const key of Object.keys(pkg)) {
    if (!(key in out)) out[key] = pkg[key];
  }
  return out;
}
function isDepMap(key) {
  return key === "dependencies" || key === "devDependencies" || key === "peerDependencies";
}
function sortKeys(obj) {
  if (!obj || typeof obj !== "object") return obj;
  return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

// src/core/features/meta.js
var meta_default = {
  id: "meta",
  active: () => true,
  apply(cfg) {
    const files = {};
    const pkg = {
      name: cfg.name,
      version: "0.0.0",
      description: cfg.description || "",
      type: cfg.moduleFormat === "cjs" ? "commonjs" : "module",
      engines: { node: `>=${cfg.nodeVersion}` },
      scripts: {}
    };
    const kw = String(cfg.keywords || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (kw.length) pkg.keywords = kw;
    if (cfg.author) pkg.author = cfg.author;
    if (cfg.repo) {
      pkg.repository = { type: "git", url: `git+${cfg.repo.replace(/\.git$/, "")}.git` };
      pkg.bugs = { url: `${cfg.repo.replace(/\.git$/, "")}/issues` };
      pkg.homepage = `${cfg.repo.replace(/\.git$/, "")}#readme`;
    }
    const ext = cfg.ext;
    files[`src/index.${ext}`] = cfg.hasLibrary ? libraryEntry(cfg) : `// ${cfg.name}
`;
    files["README.md"] = readme(cfg);
    files[".nvmrc"] = `${cfg.nodeVersion}
`;
    if (cfg.isTs) pkg.scripts.typecheck = "tsc --noEmit";
    return { files, pkg };
  }
};
function libraryEntry(cfg) {
  if (cfg.isTs) {
    return [
      `/** Greet someone by name. */`,
      `export function greet(name: string): string {`,
      `	return \`Hello, \${name}!\`;`,
      `}`,
      ``
    ].join("\n");
  }
  return [
    `/**`,
    ` * Greet someone by name.`,
    ` * @param {string} name`,
    ` * @returns {string}`,
    ` */`,
    `export function greet(name) {`,
    `	return \`Hello, \${name}!\`;`,
    `}`,
    ``
  ].join("\n");
}
function readme(cfg) {
  const install = {
    npm: `npm install ${cfg.name}`,
    pnpm: `pnpm add ${cfg.name}`,
    yarn: `yarn add ${cfg.name}`,
    bun: `bun add ${cfg.name}`
  }[cfg.packageManager];
  const lines = [
    `# ${cfg.name}`,
    "",
    cfg.description || "_A modern package scaffolded with [Packkit](https://danmat.github.io/create-packkit/)._",
    "",
    "## Install",
    "",
    "```sh",
    install,
    "```",
    ""
  ];
  if (cfg.hasLibrary) {
    const imp = cfg.isTs || cfg.hasEsm ? `import { greet } from '${cfg.name}';` : `const { greet } = require('${cfg.name}');`;
    lines.push("## Usage", "", "```" + (cfg.isTs ? "ts" : "js"), imp, "", `greet('world'); // "Hello, world!"`, "```", "");
  }
  if (cfg.hasCli) {
    lines.push("## CLI", "", "```sh", `npx ${cfg.name} --help`, "```", "");
  }
  lines.push("## License", "", cfg.license === "none" ? "Unlicensed." : `${cfg.license}${cfg.author ? " \xA9 " + cfg.author : ""}`, "");
  return lines.join("\n");
}

// src/core/features/bundler.js
var bundler_default = {
  id: "bundler",
  active: () => true,
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {} };
    const build = cfg.bundler !== "none";
    if (!build && !cfg.isTs) {
      pkg.files = ["src"];
      pkg.exports = { ".": `./src/index.js` };
      pkg.main = "./src/index.js";
      if (cfg.hasEsm) pkg.module = "./src/index.js";
    } else {
      pkg.files = ["dist"];
      const esm = "./dist/index.js";
      const cjs = "./dist/index.cjs";
      const dts = "./dist/index.d.ts";
      const exp = {};
      if (cfg.isTs) exp.types = dts;
      if (cfg.hasEsm) exp.import = esm;
      if (cfg.hasCjs) exp.require = build ? cjs : "./dist/index.cjs";
      pkg.exports = { ".": exp };
      if (cfg.hasCjs) pkg.main = exp.require;
      else pkg.main = esm;
      if (cfg.hasEsm) pkg.module = esm;
      if (cfg.isTs) pkg.types = dts;
    }
    const entries = ["src/index." + cfg.ext];
    if (cfg.hasCli) entries.push("src/cli." + cfg.ext);
    const formats = [cfg.hasEsm && "esm", cfg.hasCjs && "cjs"].filter(Boolean);
    if (cfg.bundler === "tsup" || cfg.bundler === "tsdown") {
      const tool = cfg.bundler;
      files[`${tool}.config.${cfg.ext}`] = tsupConfig(cfg, entries, formats, tool);
      pkg.scripts.build = tool;
      pkg.scripts.dev = `${tool} --watch`;
      pkg.devDependencies = { [tool]: tool === "tsup" ? "^8.0.0" : "^0.6.0" };
    } else if (cfg.bundler === "unbuild") {
      files["build.config.ts"] = unbuildConfig(cfg);
      pkg.scripts.build = "unbuild";
      pkg.scripts.dev = "unbuild --stub";
      pkg.devDependencies = { unbuild: "^2.0.0" };
    } else if (cfg.bundler === "rollup") {
      files[`rollup.config.${cfg.ext === "ts" ? "ts" : "js"}`] = rollupConfig(cfg, formats);
      pkg.scripts.build = "rollup -c";
      pkg.scripts.dev = "rollup -c -w";
      pkg.devDependencies = {
        rollup: "^4.0.0",
        ...cfg.isTs ? { "@rollup/plugin-typescript": "^11.0.0", tslib: "^2.6.0" } : {}
      };
    } else if (cfg.bundler === "none" && cfg.isTs) {
      pkg.scripts.build = "tsc";
      pkg.scripts.dev = "tsc --watch";
    }
    if (build) pkg.scripts.prepublishOnly = pkg.scripts.build;
    pkg.scripts.clean = "rimraf dist";
    if (build) pkg.devDependencies = { ...pkg.devDependencies, rimraf: "^6.0.0" };
    return { files, pkg };
  }
};
function tsupConfig(cfg, entries, formats, tool) {
  return [
    `import { defineConfig } from '${tool}';`,
    ``,
    `export default defineConfig({`,
    `	entry: [${entries.map((e) => `'${e}'`).join(", ")}],`,
    `	format: [${formats.map((f) => `'${f}'`).join(", ")}],`,
    cfg.isTs ? `	dts: true,` : null,
    `	sourcemap: true,`,
    `	clean: true,`,
    `	treeshake: true,`,
    `});`,
    ``
  ].filter((l) => l !== null).join("\n");
}
function unbuildConfig(cfg) {
  return [
    `import { defineBuildConfig } from 'unbuild';`,
    ``,
    `export default defineBuildConfig({`,
    `	entries: ['src/index'],`,
    `	declaration: ${cfg.isTs},`,
    `	clean: true,`,
    `	rollup: { emitCJS: ${cfg.hasCjs} },`,
    `});`,
    ``
  ].join("\n");
}
function rollupConfig(cfg, formats) {
  const out = formats.map((f) => `		{ file: 'dist/index.${f === "cjs" ? "cjs" : "js"}', format: '${f}', sourcemap: true }`).join(",\n");
  const tsPlugin = cfg.isTs ? `
	plugins: [typescript()],` : "";
  const tsImport = cfg.isTs ? `import typescript from '@rollup/plugin-typescript';
` : "";
  return [
    tsImport + `export default {`,
    `	input: 'src/index.${cfg.ext}',`,
    `	output: [`,
    out,
    `	],${tsPlugin}`,
    `};`,
    ``
  ].join("\n");
}

// src/core/features/typescript.js
var typescript_default = {
  id: "typescript",
  active: (cfg) => cfg.isTs,
  apply(cfg) {
    const noBuild = cfg.bundler === "none";
    const compilerOptions = {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      lib: ["ES2022"],
      strict: true,
      noUncheckedIndexedAccess: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      verbatimModuleSyntax: cfg.bundler !== "none",
      declaration: true
    };
    if (noBuild) {
      compilerOptions.moduleResolution = "NodeNext";
      compilerOptions.module = "NodeNext";
      compilerOptions.outDir = "dist";
      compilerOptions.rootDir = "src";
    } else {
      compilerOptions.noEmit = true;
    }
    return {
      files: {
        "tsconfig.json": toJson({
          $schema: "https://json.schemastore.org/tsconfig",
          compilerOptions,
          include: ["src"],
          exclude: ["dist", "node_modules"]
        })
      },
      pkg: {
        devDependencies: {
          typescript: "^5.5.0",
          "@types/node": `^${cfg.nodeVersion}.0.0`
        }
      }
    };
  }
};

// src/core/features/test.js
var test_default = {
  id: "test",
  active: (cfg) => cfg.test !== "none",
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {}, devDependencies: {} };
    const ext = cfg.ext;
    if (cfg.test === "vitest") {
      files[`vitest.config.${ext}`] = [
        `import { defineConfig } from 'vitest/config';`,
        ``,
        `export default defineConfig({`,
        `	test: {`,
        cfg.coverage ? `		coverage: { provider: 'v8', reporter: ['text', 'lcov'] },` : null,
        `	},`,
        `});`,
        ``
      ].filter((l) => l !== null).join("\n");
      pkg.scripts.test = "vitest run";
      pkg.scripts["test:watch"] = "vitest";
      pkg.devDependencies.vitest = "^2.0.0";
      if (cfg.coverage) {
        pkg.scripts.coverage = "vitest run --coverage";
        pkg.devDependencies["@vitest/coverage-v8"] = "^2.0.0";
      }
      files[`src/index.test.${ext}`] = exampleTest("vitest", cfg);
    } else if (cfg.test === "jest") {
      files["jest.config.js"] = jestConfig(cfg);
      pkg.scripts.test = "jest";
      pkg.scripts["test:watch"] = "jest --watch";
      pkg.devDependencies.jest = "^29.0.0";
      if (cfg.isTs) {
        pkg.devDependencies["ts-jest"] = "^29.0.0";
        pkg.devDependencies["@types/jest"] = "^29.0.0";
      }
      if (cfg.coverage) pkg.scripts.coverage = "jest --coverage";
      files[`src/index.test.${ext}`] = exampleTest("jest", cfg);
    } else if (cfg.test === "node") {
      pkg.scripts.test = cfg.isTs ? 'node --import tsx --test "src/**/*.test.ts"' : "node --test";
      if (cfg.isTs) pkg.devDependencies.tsx = "^4.0.0";
      files[`src/index.test.${ext}`] = exampleTest("node", cfg);
    }
    return { files, pkg };
  }
};
function importPath(runner, cfg) {
  if (!cfg.isTs) return "./index.js";
  if (runner === "node") return "./index.ts";
  return "./index.js";
}
function exampleTest(runner, cfg) {
  const imp = importPath(runner, cfg);
  if (runner === "node") {
    return [
      `import { test } from 'node:test';`,
      `import assert from 'node:assert/strict';`,
      `import { greet } from '${imp}';`,
      ``,
      `test('greet', () => {`,
      `	assert.equal(greet('world'), 'Hello, world!');`,
      `});`,
      ``
    ].join("\n");
  }
  const api = runner === "jest" ? `` : `import { describe, it, expect } from 'vitest';
`;
  const expectApi = runner === "jest" ? "" : "";
  return [
    api + `import { greet } from '${imp}';`,
    ``,
    `describe('greet', () => {`,
    `	it('greets by name', () => {`,
    `		expect(greet('world')).toBe('Hello, world!');`,
    `	});`,
    `});`,
    ``
  ].join("\n");
}
function jestConfig(cfg) {
  if (cfg.isTs) {
    return [
      `/** @type {import('jest').Config} */`,
      `export default {`,
      `	preset: 'ts-jest/presets/default-esm',`,
      `	testEnvironment: 'node',`,
      `	extensionsToTreatAsEsm: ['.ts'],`,
      `};`,
      ``
    ].join("\n");
  }
  return [
    `/** @type {import('jest').Config} */`,
    `export default {`,
    `	testEnvironment: 'node',`,
    `};`,
    ``
  ].join("\n");
}

// src/core/features/lint.js
var lint_default = {
  id: "lint",
  active: (cfg) => cfg.lint !== "none",
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {}, devDependencies: {} };
    if (cfg.lint === "eslint-prettier" || cfg.lint === "oxlint") {
      files[".prettierrc.json"] = toJson({
        useTabs: true,
        singleQuote: true,
        semi: true,
        printWidth: 100,
        trailingComma: "all"
      });
      files[".prettierignore"] = "dist\ncoverage\n";
      pkg.scripts.format = "prettier --write .";
      pkg.scripts["format:check"] = "prettier --check .";
      pkg.devDependencies.prettier = "^3.3.0";
    }
    if (cfg.lint === "eslint-prettier") {
      files["eslint.config.js"] = eslintFlatConfig(cfg);
      pkg.scripts.lint = "eslint .";
      pkg.scripts["lint:fix"] = "eslint . --fix";
      pkg.devDependencies.eslint = "^9.0.0";
      pkg.devDependencies["@eslint/js"] = "^9.0.0";
      if (cfg.isTs) pkg.devDependencies["typescript-eslint"] = "^8.0.0";
    } else if (cfg.lint === "oxlint") {
      pkg.scripts.lint = "oxlint";
      pkg.devDependencies.oxlint = "^0.9.0";
    } else if (cfg.lint === "biome") {
      files["biome.json"] = toJson({
        $schema: "https://biomejs.dev/schemas/1.8.0/schema.json",
        formatter: { enabled: true, indentStyle: "tab", lineWidth: 100 },
        linter: { enabled: true, rules: { recommended: true } },
        javascript: { formatter: { quoteStyle: "single", trailingCommas: "all" } }
      });
      pkg.scripts.lint = "biome check .";
      pkg.scripts["lint:fix"] = "biome check --write .";
      pkg.scripts.format = "biome format --write .";
      pkg.devDependencies["@biomejs/biome"] = "^1.8.0";
    }
    return { files, pkg };
  }
};
function eslintFlatConfig(cfg) {
  if (cfg.isTs) {
    return [
      `import js from '@eslint/js';`,
      `import tseslint from 'typescript-eslint';`,
      ``,
      `export default tseslint.config(`,
      `	js.configs.recommended,`,
      `	...tseslint.configs.recommended,`,
      `	{ ignores: ['dist', 'coverage'] },`,
      `);`,
      ``
    ].join("\n");
  }
  return [
    `import js from '@eslint/js';`,
    ``,
    `export default [`,
    `	js.configs.recommended,`,
    `	{ languageOptions: { ecmaVersion: 'latest', sourceType: 'module' } },`,
    `	{ ignores: ['dist', 'coverage'] },`,
    `];`,
    ``
  ].join("\n");
}

// src/core/features/githooks.js
var githooks_default = {
  id: "githooks",
  active: (cfg) => cfg.gitHooks !== "none",
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {}, devDependencies: {} };
    const codeGlob = cfg.isTs ? "*.{js,ts}" : "*.js";
    const staged = cfg.lint === "biome" ? { [codeGlob]: "biome check --write --no-errors-on-unmatched" } : cfg.lint === "eslint-prettier" ? { [codeGlob]: ["prettier --write", "eslint --fix"], "*.{json,md,yml}": "prettier --write" } : cfg.lint === "oxlint" ? { [codeGlob]: ["prettier --write", "oxlint"], "*.{json,md,yml}": "prettier --write" } : null;
    const needsLintStaged = cfg.gitHooks !== "lefthook" && staged;
    if (cfg.gitHooks === "simple-git-hooks") {
      pkg["simple-git-hooks"] = { "pre-commit": needsLintStaged ? "npx lint-staged" : "npm test" };
      pkg.scripts.prepare = "simple-git-hooks";
      pkg.devDependencies["simple-git-hooks"] = "^2.11.0";
    } else if (cfg.gitHooks === "husky") {
      files[".husky/pre-commit"] = needsLintStaged ? "npx lint-staged\n" : "npm test\n";
      pkg.scripts.prepare = "husky";
      pkg.devDependencies.husky = "^9.1.0";
    } else if (cfg.gitHooks === "lefthook") {
      files["lefthook.yml"] = lefthookYml(cfg, staged);
      pkg.scripts.prepare = "lefthook install";
      pkg.devDependencies.lefthook = "^1.7.0";
    }
    if (needsLintStaged) {
      pkg["lint-staged"] = staged;
      pkg.devDependencies["lint-staged"] = "^15.2.0";
    }
    return { files, pkg };
  }
};
function lefthookYml(cfg, staged) {
  const cmd = cfg.lint === "biome" ? "biome check --write --no-errors-on-unmatched {staged_files}" : cfg.lint === "none" ? "npm test" : "prettier --write {staged_files}";
  return [
    "pre-commit:",
    "  commands:",
    "    format:",
    `      glob: '*.{js,ts,json,md}'`,
    `      run: ${cmd}`,
    ""
  ].join("\n");
}

// src/core/features/release.js
var release_default = {
  id: "release",
  active: (cfg) => cfg.release !== "none",
  apply(cfg) {
    const files = {};
    const pkg = { scripts: {}, devDependencies: {} };
    if (cfg.release === "changesets") {
      files[".changeset/config.json"] = toJson({
        $schema: "https://unpkg.com/@changesets/config@3.0.0/schema.json",
        changelog: "@changesets/cli/changelog",
        commit: false,
        access: "public",
        baseBranch: "main",
        updateInternalDependencies: "patch"
      });
      files[".changeset/README.md"] = "# Changesets\n\nRun `npx changeset` to record a version bump for your next release.\n";
      pkg.scripts.changeset = "changeset";
      pkg.scripts.version = "changeset version";
      pkg.scripts.release = `${buildThen(cfg)}changeset publish`;
      pkg.devDependencies["@changesets/cli"] = "^2.27.0";
    } else if (cfg.release === "release-it") {
      files[".release-it.json"] = toJson({
        git: { commitMessage: "chore: release v${version}" },
        github: { release: true },
        npm: { publish: true }
      });
      pkg.scripts.release = "release-it";
      pkg.devDependencies["release-it"] = "^17.0.0";
    } else if (cfg.release === "np") {
      pkg.scripts.release = "np";
      pkg.devDependencies.np = "^10.0.0";
    }
    return { files, pkg };
  }
};
function buildThen(cfg) {
  return cfg.bundler !== "none" || cfg.isTs ? "npm run build && " : "";
}

// src/core/features/cli.js
var cli_default = {
  id: "cli",
  active: (cfg) => cfg.hasCli,
  apply(cfg) {
    const build = cfg.bundler !== "none";
    const binPath = build || cfg.isTs ? "./dist/cli.js" : "./src/cli.js";
    const files = {};
    files[`src/cli.${cfg.ext}`] = cliScaffold(cfg);
    return {
      files,
      pkg: {
        bin: { [binName(cfg.name)]: binPath }
      }
    };
  }
};
function binName(name) {
  return name.startsWith("@") ? name.split("/")[1] : name;
}
function cliScaffold(cfg) {
  const importLine = cfg.hasLibrary ? `import { greet } from './index.${cfg.isTs ? "js" : "js"}';
` : "";
  const body = cfg.hasLibrary ? `const name = process.argv[2] ?? 'world';
console.log(greet(name));
` : `console.log('${cfg.name} \u2014 hello from your CLI');
`;
  return `#!/usr/bin/env node
${importLine}
${body}`;
}

// src/core/features/workflows.js
function pmInstall(cfg) {
  return {
    npm: "npm ci",
    pnpm: "pnpm install --frozen-lockfile",
    yarn: "yarn install --immutable",
    bun: "bun install --frozen-lockfile"
  }[cfg.packageManager];
}
function pmRun(cfg, script) {
  return cfg.packageManager === "npm" ? `npm run ${script}` : `${cfg.packageManager} ${script}`;
}
function setupSteps(cfg) {
  const steps = ["      - uses: actions/checkout@v4"];
  if (cfg.packageManager === "pnpm") steps.push("      - uses: pnpm/action-setup@v4");
  if (cfg.packageManager === "bun") {
    steps.push("      - uses: oven-sh/setup-bun@v2");
  } else {
    steps.push(
      "      - uses: actions/setup-node@v4",
      "        with:",
      `          node-version: '${cfg.nodeVersion}'`,
      `          cache: '${cfg.packageManager === "yarn" ? "yarn" : cfg.packageManager === "pnpm" ? "pnpm" : "npm"}'`
    );
  }
  steps.push(`      - run: ${pmInstall(cfg)}`);
  return steps.join("\n");
}
var workflows_default = {
  id: "workflows",
  active: (cfg) => cfg.workflows && cfg.workflows.length || cfg.deps !== "none",
  apply(cfg) {
    const files = {};
    const wf = cfg.workflows || [];
    if (wf.includes("ci")) files[".github/workflows/ci.yml"] = ciWorkflow(cfg, wf.includes("codecov"));
    if (wf.includes("npm-publish")) files[".github/workflows/release.yml"] = releaseWorkflow(cfg);
    if (wf.includes("pages")) files[".github/workflows/pages.yml"] = pagesWorkflow(cfg);
    if (wf.includes("codeql")) files[".github/workflows/codeql.yml"] = codeqlWorkflow();
    if (wf.includes("stale")) files[".github/workflows/stale.yml"] = staleWorkflow();
    if (cfg.deps === "renovate") {
      files[".github/renovate.json"] = toJson({
        $schema: "https://docs.renovatebot.com/renovate-schema.json",
        extends: ["config:recommended", ":semanticCommits"]
      });
    } else if (cfg.deps === "dependabot") {
      files[".github/dependabot.yml"] = [
        "version: 2",
        "updates:",
        "  - package-ecosystem: npm",
        '    directory: "/"',
        "    schedule:",
        "      interval: weekly",
        "  - package-ecosystem: github-actions",
        '    directory: "/"',
        "    schedule:",
        "      interval: weekly",
        ""
      ].join("\n");
    }
    return { files, pkg: {} };
  }
};
function ciWorkflow(cfg, codecov) {
  const jobs = [];
  if (cfg.isTs) jobs.push(`      - run: ${pmRun(cfg, "typecheck")}`);
  if (cfg.lint !== "none") jobs.push(`      - run: ${pmRun(cfg, "lint")}`);
  if (cfg.test !== "none") jobs.push(`      - run: ${pmRun(cfg, codecov ? "coverage" : "test")}`);
  if (cfg.bundler !== "none" || cfg.isTs) jobs.push(`      - run: ${pmRun(cfg, "build")}`);
  const cov = codecov ? "\n      - uses: codecov/codecov-action@v4\n        with:\n          token: ${{ secrets.CODECOV_TOKEN }}" : "";
  return [
    "name: CI",
    "on:",
    "  push:",
    "    branches: [main]",
    "  pull_request:",
    "jobs:",
    "  ci:",
    "    runs-on: ubuntu-latest",
    setupSteps(cfg),
    jobs.join("\n") + cov,
    ""
  ].join("\n");
}
function releaseWorkflow(cfg) {
  if (cfg.release === "changesets") {
    return [
      "name: Release",
      "on:",
      "  push:",
      "    branches: [main]",
      "concurrency: ${{ github.workflow }}-${{ github.ref }}",
      "permissions:",
      "  contents: write",
      "  pull-requests: write",
      "  id-token: write",
      "jobs:",
      "  release:",
      "    runs-on: ubuntu-latest",
      setupSteps(cfg),
      "      - uses: changesets/action@v1",
      "        with:",
      `          publish: ${pmRun(cfg, "release")}`,
      "          version: " + pmRun(cfg, "version"),
      "        env:",
      "          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}",
      '          NPM_CONFIG_PROVENANCE: "true"',
      "        # add NPM_TOKEN as a repo secret, or use npm Trusted Publishing (OIDC)",
      ""
    ].join("\n");
  }
  return [
    "name: Publish",
    "on:",
    "  push:",
    '    tags: ["v*"]',
    "permissions:",
    "  contents: read",
    "  id-token: write",
    "jobs:",
    "  publish:",
    "    runs-on: ubuntu-latest",
    setupSteps(cfg),
    cfg.bundler !== "none" || cfg.isTs ? `      - run: ${pmRun(cfg, "build")}` : null,
    "      - run: npm publish --provenance --access public",
    "        env:",
    "          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}",
    ""
  ].filter((l) => l !== null).join("\n");
}
function pagesWorkflow(cfg) {
  return [
    "name: Deploy Pages",
    "on:",
    "  push:",
    "    branches: [main]",
    "permissions:",
    "  contents: read",
    "  pages: write",
    "  id-token: write",
    "concurrency:",
    "  group: pages",
    "  cancel-in-progress: true",
    "jobs:",
    "  deploy:",
    "    environment:",
    "      name: github-pages",
    "      url: ${{ steps.deployment.outputs.page_url }}",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: actions/configure-pages@v5",
    "      - uses: actions/upload-pages-artifact@v3",
    "        with:",
    "          path: ./docs",
    "      - id: deployment",
    "        uses: actions/deploy-pages@v4",
    ""
  ].join("\n");
}
function codeqlWorkflow() {
  return [
    "name: CodeQL",
    "on:",
    "  push:",
    "    branches: [main]",
    "  pull_request:",
    "  schedule:",
    '    - cron: "0 6 * * 1"',
    "jobs:",
    "  analyze:",
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      security-events: write",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: github/codeql-action/init@v3",
    "        with:",
    "          languages: javascript-typescript",
    "      - uses: github/codeql-action/analyze@v3",
    ""
  ].join("\n");
}
function staleWorkflow() {
  return [
    "name: Stale",
    "on:",
    "  schedule:",
    '    - cron: "0 0 * * *"',
    "jobs:",
    "  stale:",
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      issues: write",
    "      pull-requests: write",
    "    steps:",
    "      - uses: actions/stale@v9",
    "        with:",
    "          days-before-stale: 60",
    "          days-before-close: 7",
    ""
  ].join("\n");
}

// src/core/features/community.js
var community_default = {
  id: "community",
  active: (cfg) => cfg.license !== "none" || cfg.community,
  apply(cfg) {
    const files = {};
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const holder = cfg.author || "the authors";
    if (cfg.license === "MIT") files["LICENSE"] = mit(year, holder);
    else if (cfg.license === "ISC") files["LICENSE"] = isc(year, holder);
    else if (cfg.license === "Apache-2.0") files["LICENSE"] = apacheStub(year, holder);
    if (cfg.community) {
      files["CONTRIBUTING.md"] = contributing(cfg);
      files["CODE_OF_CONDUCT.md"] = codeOfConduct(cfg);
      files["SECURITY.md"] = security();
      files[".github/ISSUE_TEMPLATE/bug_report.md"] = bugReport();
      files[".github/ISSUE_TEMPLATE/feature_request.md"] = featureRequest();
      files[".github/PULL_REQUEST_TEMPLATE.md"] = prTemplate();
    }
    return { files, pkg: {} };
  }
};
function mit(year, holder) {
  return `MIT License

Copyright (c) ${year} ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}
function isc(year, holder) {
  return `ISC License

Copyright (c) ${year} ${holder}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
`;
}
function apacheStub(year, holder) {
  return `Copyright ${year} ${holder}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Full text: https://www.apache.org/licenses/LICENSE-2.0.txt
`;
}
function contributing(cfg) {
  const pm = cfg.packageManager;
  const install = pm === "npm" ? "npm install" : `${pm} install`;
  return `# Contributing

Thanks for your interest in contributing!

## Development

\`\`\`sh
${install}
${pm === "npm" ? "npm test" : pm + " test"}
\`\`\`

## Pull requests

- Create a branch, make your change, and open a PR against \`main\`.
- Make sure lint, types and tests pass.
${cfg.release === "changesets" ? "- Run `npx changeset` to describe your change for the changelog.\n" : ""}
`;
}
function codeOfConduct() {
  return `# Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
By participating, you are expected to uphold this code. Report unacceptable
behavior to the maintainers.
`;
}
function security() {
  return `# Security Policy

If you discover a security vulnerability, please **do not** open a public issue.
Instead, report it privately to the maintainers (e.g. via GitHub Security
Advisories). We will respond as quickly as possible.
`;
}
function bugReport() {
  return `---
name: Bug report
about: Report a problem
labels: bug
---

**Describe the bug**

**To reproduce**

**Expected behavior**

**Environment**
- Version:
- Node:
- OS:
`;
}
function featureRequest() {
  return `---
name: Feature request
about: Suggest an idea
labels: enhancement
---

**Problem**

**Proposed solution**

**Alternatives considered**
`;
}
function prTemplate() {
  return `## Summary

<!-- What does this change and why? -->

## Checklist

- [ ] Tests pass
- [ ] Lint & types pass
- [ ] Docs updated if needed
`;
}

// src/core/features/agents.js
var agents_default = {
  id: "agents",
  active: (cfg) => cfg.agents,
  apply(cfg) {
    const run = (s) => cfg.packageManager === "npm" ? `npm run ${s}` : `${cfg.packageManager} ${s}`;
    const test = cfg.packageManager === "npm" ? "npm test" : `${cfg.packageManager} test`;
    const commands = [];
    if (cfg.isTs) commands.push(`- Type-check: \`${run("typecheck")}\``);
    if (cfg.lint !== "none") commands.push(`- Lint: \`${run("lint")}\``);
    if (cfg.test !== "none") commands.push(`- Test: \`${test}\``);
    if (cfg.bundler !== "none" || cfg.isTs) commands.push(`- Build: \`${run("build")}\``);
    const stack = [
      `- Language: ${cfg.isTs ? "TypeScript (strict)" : "JavaScript (ESM)"}`,
      `- Module format: ${cfg.moduleFormat.toUpperCase()}`,
      `- Package manager: ${cfg.packageManager}`,
      cfg.bundler !== "none" ? `- Bundler: ${cfg.bundler}` : `- Build: ${cfg.isTs ? "tsc" : "none"}`,
      cfg.test !== "none" ? `- Tests: ${cfg.test}` : null,
      cfg.lint !== "none" ? `- Lint/format: ${cfg.lint}` : null
    ].filter(Boolean);
    const agents = [
      `# AGENTS.md`,
      ``,
      `Guidance for AI coding agents working in **${cfg.name}**.`,
      ``,
      `## Stack`,
      ``,
      ...stack,
      ``,
      `## Commands`,
      ``,
      ...commands,
      ``,
      `## Conventions`,
      ``,
      `- Source lives in \`src/\`. Keep the public API in \`src/index.${cfg.ext}\`.`,
      `- Add or update tests for any behavior change.`,
      cfg.isTs ? `- Prefer explicit types on exported functions; keep \`strict\` passing.` : `- Use ESM syntax and JSDoc types where helpful.`,
      cfg.release === "changesets" ? `- Run \`npx changeset\` after a user-facing change.` : null,
      `- Do not commit \`dist/\` or \`node_modules/\`.`,
      ``
    ].filter((l) => l !== null).join("\n");
    return {
      files: {
        "AGENTS.md": agents,
        "CLAUDE.md": `See [AGENTS.md](./AGENTS.md) for build/test commands and conventions.
`
      },
      pkg: {}
    };
  }
};

// src/core/features/vscode.js
var vscode_default = {
  id: "vscode",
  active: (cfg) => cfg.vscode,
  apply(cfg) {
    const biome = cfg.lint === "biome";
    const settings = {
      "editor.formatOnSave": cfg.lint !== "none",
      "editor.defaultFormatter": biome ? "biomejs.biome" : "esbenp.prettier-vscode",
      "editor.insertSpaces": false
    };
    if (cfg.lint === "eslint-prettier" || cfg.lint === "oxlint") {
      settings["editor.codeActionsOnSave"] = { "source.fixAll": "explicit" };
    }
    const recommendations = [];
    if (biome) recommendations.push("biomejs.biome");
    else {
      if (cfg.lint === "eslint-prettier") recommendations.push("dbaeumer.vscode-eslint");
      if (cfg.lint !== "none") recommendations.push("esbenp.prettier-vscode");
    }
    if (cfg.test === "vitest") recommendations.push("vitest.explorer");
    return {
      files: {
        ".vscode/settings.json": toJson(settings),
        ".vscode/extensions.json": toJson({ recommendations })
      },
      pkg: {}
    };
  }
};

// src/core/features/gitfiles.js
var GITIGNORE = `# dependencies
node_modules/
.pnp.*
.yarn/*

# build output
dist/
coverage/
*.tsbuildinfo

# logs
*.log
npm-debug.log*

# env & editor
.env
.env.*
!.env.example
.DS_Store
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/
`;
var EDITORCONFIG = `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = tab

[*.{json,yml,yaml,md}]
indent_style = space
indent_size = 2
`;
var gitfiles_default = {
  id: "gitfiles",
  active: () => true,
  apply(cfg) {
    const files = { ".gitignore": GITIGNORE };
    if (cfg.editorconfig) files[".editorconfig"] = EDITORCONFIG;
    return { files, pkg: {} };
  }
};

// src/core/features/index.js
var features_default = [
  meta_default,
  bundler_default,
  typescript_default,
  test_default,
  lint_default,
  githooks_default,
  release_default,
  cli_default,
  workflows_default,
  community_default,
  agents_default,
  vscode_default,
  gitfiles_default
];

// src/core/presets.js
var PRESETS = {
  "ts-lib": { language: "ts", target: ["library"], moduleFormat: "dual" },
  "js-lib": { language: "js", target: ["library"], moduleFormat: "dual", bundler: "tsup" },
  "ts-cli": { language: "ts", target: ["cli", "library"], moduleFormat: "esm" },
  cli: { language: "ts", target: ["cli", "library"], moduleFormat: "esm" },
  minimal: {
    language: "ts",
    target: ["library"],
    moduleFormat: "dual",
    bundler: "tsup",
    test: "none",
    lint: "none",
    gitHooks: "none",
    release: "none",
    workflows: ["ci"],
    deps: "none",
    community: false,
    agents: false,
    vscode: false
  },
  full: {
    language: "ts",
    target: ["library", "cli"],
    moduleFormat: "dual",
    bundler: "tsup",
    test: "vitest",
    coverage: true,
    lint: "eslint-prettier",
    gitHooks: "simple-git-hooks",
    release: "changesets",
    workflows: ["ci", "npm-publish", "pages", "codeql", "codecov", "stale"],
    deps: "renovate",
    community: true,
    agents: true,
    vscode: true
  }
};
var PRESET_NAMES = Object.keys(PRESETS);

// src/core/index.js
function fromPreset(name, overrides = {}) {
  const preset = PRESETS[name];
  if (!preset) throw new Error(`Unknown preset "${name}". Known: ${PRESET_NAMES.join(", ")}`);
  return normalizeConfig({ ...preset, ...overrides });
}
function generate(input) {
  const cfg = normalizeConfig(input);
  const files = {};
  let pkg = {};
  for (const feat of features_default) {
    if (!feat.active(cfg)) continue;
    const out = feat.apply(cfg) || {};
    if (out.files) {
      for (const [path, contents] of Object.entries(out.files)) files[path] = contents;
    }
    if (out.pkg) pkg = deepMerge(pkg, out.pkg);
  }
  files["package.json"] = toJson(finalizePackageJson(pkg));
  return {
    config: cfg,
    files,
    postCommands: postCommands(cfg),
    summary: summarize(cfg, files)
  };
}
function postCommands(cfg) {
  const install = {
    npm: "npm install",
    pnpm: "pnpm install",
    yarn: "yarn install",
    bun: "bun install"
  }[cfg.packageManager];
  const cmds = [];
  if (cfg.gitInit) cmds.push("git init", "git add -A", 'git commit -m "Initial commit from Packkit"');
  if (cfg.install) cmds.push(install);
  return cmds;
}
function summarize(cfg, files) {
  return {
    name: cfg.name,
    fileCount: Object.keys(files).length,
    stack: [
      cfg.isTs ? "TypeScript" : "JavaScript",
      cfg.moduleFormat.toUpperCase(),
      cfg.target.join("+"),
      cfg.bundler !== "none" ? cfg.bundler : cfg.isTs ? "tsc" : "no-build",
      cfg.test !== "none" ? cfg.test : null,
      cfg.lint !== "none" ? cfg.lint : null,
      cfg.release !== "none" ? cfg.release : null
    ].filter(Boolean),
    workflows: cfg.workflows
  };
}
export {
  GROUPS,
  OPTIONS,
  PRESETS,
  PRESET_NAMES,
  defaultConfig,
  fromPreset,
  generate,
  normalizeConfig
};
