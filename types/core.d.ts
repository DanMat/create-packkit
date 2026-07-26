// Public types for the pure generation core.

export type Language = 'ts' | 'js';
export type ModuleFormat = 'esm' | 'dual' | 'cjs';
export type Framework = 'none' | 'react' | 'vue' | 'svelte';
export type Target = 'library' | 'cli' | 'service' | 'app';
export type Bundler = 'tsup' | 'tsdown' | 'unbuild' | 'rollup' | 'none';
export type TestRunner = 'vitest' | 'jest' | 'node' | 'none';
export type Linter = 'eslint-prettier' | 'biome' | 'oxlint' | 'none';
export type ReleaseTool = 'changesets' | 'release-it' | 'np' | 'none';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

/** User-facing configuration. All fields optional on input; a preset or the
 *  defaults fill the rest. */
export interface PackkitConfig {
  name?: string;
  description?: string;
  author?: string;
  keywords?: string;
  repo?: string;
  language?: Language;
  moduleFormat?: ModuleFormat;
  framework?: Framework;
  target?: Target[];
  serviceFramework?: 'hono' | 'fastify' | 'express';
  monorepo?: boolean;
  monorepoLayout?: 'libraries' | 'fullstack';
  packageManager?: PackageManager;
  nodeVersion?: string;
  bundler?: Bundler;
  minify?: boolean;
  test?: TestRunner;
  coverage?: boolean;
  storybook?: boolean;
  e2e?: boolean;
  sourcemaps?: boolean;
  env?: boolean;
  canary?: boolean;
  pkgChecks?: boolean;
  knip?: boolean;
  sizeLimit?: boolean;
  doctor?: boolean;
  lint?: Linter;
  gitHooks?: 'simple-git-hooks' | 'husky' | 'lefthook' | 'none';
  release?: ReleaseTool;
  jsr?: boolean;
  workflows?: string[];
  deps?: 'renovate' | 'dependabot' | 'none';
  license?: string;
  community?: boolean;
  agents?: boolean;
  vscode?: boolean;
  editorconfig?: boolean;
  gitInit?: boolean;
  install?: boolean;
  [key: string]: unknown;
}

/** The config after normalization: every field resolved, plus derived flags. */
export interface ResolvedPackkitConfig extends PackkitConfig {
  isTs: boolean;
  isReact: boolean;
  isVue: boolean;
  isSvelte: boolean;
  hasFramework: boolean;
  hasApp: boolean;
  hasLibrary: boolean;
  hasCli: boolean;
  hasService: boolean;
  hasBuild: boolean;
  publishable: boolean;
  preset?: string;
}

export interface ProjectSummary {
  name: string;
  fileCount: number;
  stack: string[];
  workflows: string[];
}

export interface GenerateResult {
  config: ResolvedPackkitConfig;
  files: Record<string, string>;
  postCommands: string[];
  summary: ProjectSummary;
}

export function generate(input?: PackkitConfig): GenerateResult;
export function fromPreset(name: string, overrides?: PackkitConfig): ResolvedPackkitConfig;
export function normalizeConfig(input?: PackkitConfig, diagnostics?: unknown[]): ResolvedPackkitConfig;
export function resolvePreset(name: string): string | undefined;

export const OPTIONS: Record<string, unknown>;
export const PRESET_NAMES: string[];
export const PRESET_ALIASES: Record<string, string>;
