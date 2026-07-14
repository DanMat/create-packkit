# Packkit 📦

> A highly configurable scaffolder for modern **npm packages and CLIs** — pick your stack from a CLI **or** a web configurator, and get a ready-to-ship repo.

[![Configure on the web](https://img.shields.io/badge/configure-on%20the%20web-00e5ff)](https://danmat.github.io/create-packkit/)
[![npm](https://img.shields.io/npm/v/create-packkit)](https://www.npmjs.com/package/create-packkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Most scaffolders lock you into one stack, one language, and the terminal. Packkit lets you **choose** — TypeScript or JavaScript, library or CLI, ESM/CJS/dual, your bundler, test runner, linter, git hooks, release flow, GitHub Actions and more — and it works from a CLI **or** a browser page that downloads your project as a zip.

## Quick start

```sh
# interactive wizard
npm create packkit@latest
# or with npx
npx create-packkit

# skip the wizard with a preset
npx create-packkit ts-lib my-lib
npx create-packkit cli my-tool
npx create-packkit --preset full my-pkg --pm pnpm
```

Then `cd`, and you already have a working project — `build`, `test`, and `lint` all pass out of the box.

## Or configure it on the web

No install needed: **[danmat.github.io/create-packkit](https://danmat.github.io/create-packkit/)** — tick the options, preview the file tree, and **download a zip** (or copy the equivalent `npx create-packkit` command). Everything runs in your browser.

## Options reference

Every flag, its values (**default** in bold), and what it's for. Prefer the interactive [web configurator](https://danmat.github.io/create-packkit/) — the same descriptions appear as you hover. _This table is generated from the schema (`npm run gen:reference`)._

<!-- OPTIONS:START -->

### Package

| Flag | Values | What it does |
|---|---|---|
| `--name` | — | The npm package name. Scoped names like `@you/pkg` are fine. |
| `--description` | — | One-line summary — used in package.json and the README heading. |
| `--author` | — | Your name (and optionally email/URL). Populates package.json + LICENSE. |
| `--keywords` | — | Comma-separated npm keywords to help people discover the package. |
| `--repo` | — | Git repository URL. Wires up repository/bugs/homepage links and CI badges. |

### Core

| Flag | Values | What it does |
|---|---|---|
| `--language` | **ts** · js | TypeScript (strict, recommended) or plain ESM JavaScript. TS gives you types, editor help, and generated .d.ts for consumers. |
| `--module` | **esm** · dual · cjs | How the package is consumed. ESM-only (default) is the modern, leanest choice — Node 20.19+/22.12+ can `require()` ESM. Pick dual only if you must support older CJS-only consumers; cjs-only is rarely needed. |
| `--server` | **hono** · fastify · express | For the service target: Hono (fast, web-standard, tiny — default), Fastify (batteries-included, plugins, schema validation), or Express (ubiquitous, huge ecosystem). |
| `--target` | **library** · cli · service · app | What you are building — mix and match: a library (importable package), a CLI (ships a bin), an HTTP service, or an app (Vite SPA). |
| `--monorepo` | on / off (default: **off**) | Generate a pnpm + Turborepo workspace with two linked example packages and Changesets. Only worth it when ≥2 packages share code. |
| `--framework` | **none** · react · vue · svelte | UI framework for component libraries and apps: React, Vue, or Svelte (or none for a plain package). |
| `--pm` | **npm** · pnpm · yarn · bun | Which package manager the scripts, lockfile, and CI target: npm, pnpm, yarn, or bun. |
| `--node` | 22 · **24** · 26 | Minimum Node line to support. Choices track Node’s own release schedule (Active LTS is the default); this sets engines + .nvmrc. |

### Build

| Flag | Values | What it does |
|---|---|---|
| `--bundler` | **tsup** · tsdown · unbuild · rollup · none | How the library is built. tsup (default, esbuild-fast) and tsdown suit most libs; unbuild for zero-config; rollup for full control; none = tsc-only (or no build). |
| `--minify` | on / off (default: **off**) | Minify the build output. Best for CLIs and browser bundles; usually unnecessary for libraries (consumers minify). |
| `--no-sourcemaps` | on / off (default: **on**) | Ship source + JS/declaration maps so consumers can step into and go-to-definition on your original code when debugging. On by default for libraries. |

### Quality

| Flag | Values | What it does |
|---|---|---|
| `--test` | **vitest** · jest · node · none | Test runner: Vitest (fast, Vite-native, default), Jest (classic, huge ecosystem), or Node’s built-in node:test (zero deps). |
| `--no-coverage` | on / off (default: **on**) | Collect code-coverage reports (v8) and add a `coverage` script. Pairs with the Codecov workflow. |
| `--storybook` | on / off (default: **off**) | Add Storybook to develop and document components in isolation. Component libraries only. |
| `--e2e` | on / off (default: **off**) | Add Playwright end-to-end tests for app targets: a config that boots your dev server, an example spec, and a CI job. |
| `--env` | on / off (default: **off**) | Type-safe environment variables: a Zod-validated `src/env.ts` that fails fast on misconfig, plus a `.env.example`. For services and CLIs. |
| `--pkg-checks` | on / off (default: **off**) | Verify the published package is correct with publint + are-the-types-wrong (exports map, types resolution, ESM/CJS). Highly recommended for libraries. |
| `--knip` | on / off (default: **off**) | Find unused files, dependencies, and exports so the project doesn’t accumulate dead weight. |
| `--size-limit` | on / off (default: **off**) | Add a bundle-size budget (size-limit) that measures your built entry and fails CI if it exceeds the limit — catches accidental bloat. |
| `--doctor` | on / off (default: **off**) | Add an env doctor (`npm run doctor`) that warns when the local Node / package manager don’t match what the project expects. Warn-only. |
| `--lint` | **eslint-prettier** · biome · oxlint · none | Linter + formatter: ESLint + Prettier (default, most compatible), Biome (one fast tool for both), or oxlint (Rust-fast linting). |
| `--hooks` | **simple-git-hooks** · husky · lefthook · none | Pre-commit hooks that run lint-staged: simple-git-hooks (tiny, default), husky (popular), or lefthook (fast, parallel). |

### Release

| Flag | Values | What it does |
|---|---|---|
| `--canary` | on / off (default: **off**) | Add a workflow that publishes snapshot builds (x.y.z-canary-<hash>) to a `canary` dist-tag so people can test unreleased changes. Requires Changesets. |
| `--release` | **changesets** · release-it · np · none | How you version + publish: Changesets (default, great for libraries and monorepos), release-it, np, or none. |
| `--jsr` | on / off (default: **off**) | Also publish to JSR, the TypeScript-first registry. For plain ESM TypeScript libraries. |

### CI / CD

| Flag | Values | What it does |
|---|---|---|
| `--workflows` | **ci** · **npm-publish** · pages · codeql · codecov · stale | GitHub Actions to include: ci (lint/test/build), npm-publish (provenance), pages (deploy Storybook/site), codeql (security), codecov (coverage), stale. |
| `--deps` | **renovate** · dependabot · none | Automated dependency updates: Renovate (default, powerful) or Dependabot (built into GitHub). |

### Repository

| Flag | Values | What it does |
|---|---|---|
| `--license` | **MIT** · Apache-2.0 · ISC · none | Open-source license for the LICENSE file and package.json (MIT recommended), or none. |
| `--no-community` | on / off (default: **on**) | Community health files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, and issue/PR templates. |
| `--no-agents` | on / off (default: **on**) | AI-agent instructions (AGENTS.md + CLAUDE.md) so coding agents know how to build, test, and work in the repo. |
| `--no-vscode` | on / off (default: **on**) | VS Code workspace settings + recommended-extensions so the repo is set up consistently on open. |
| `--no-editorconfig` | on / off (default: **on**) | An .editorconfig so every editor uses the same indentation and line endings. |
| `--no-git` | on / off (default: **on**) | Run `git init` and make an initial commit after scaffolding. |
| `--no-install` | on / off (default: **on**) | Install dependencies automatically after scaffolding. |

<!-- OPTIONS:END -->

## Presets

Named bundles of the options above — `npx packkit <preset> <name> -y`.

<!-- PRESETS:START -->

| Preset | Shortcut | What you get |
|---|---|---|
| `ts-lib` | `lib` | TypeScript library — ESM-only, tsup, Vitest, ESLint. |
| `js-lib` | `jslib` | JavaScript (ESM) library — tsup, Vitest, ESLint. |
| `ts-cli` | — | TypeScript CLI + library — ESM, ships a bin. |
| `cli` | — | TypeScript CLI tool — ESM, ships a bin. |
| `react-lib` | `rlib` | React component library (TS) — JSX, peer deps, jsdom tests. |
| `react-lib-js` | — | React component library (JS) — JSX, peer deps, jsdom tests. |
| `react-app` | `rapp` | React SPA — Vite dev server, build, Testing Library. |
| `vue-lib` | `vlib` | Vue component library — Vite lib build (SFCs), ESM + types. |
| `vue-app` | `vapp` | Vue SPA — Vite dev server, build, Testing Library. |
| `svelte-lib` | `slib` | Svelte component library — ships source, peer svelte, jsdom tests. |
| `svelte-app` | `sapp` | Svelte SPA — Vite dev server, build, Testing Library. |
| `node-service` | `svc`, `service` | Node HTTP service (Hono) — tsx dev, tsup build, Dockerfile. |
| `monorepo` | — | pnpm + Turborepo workspace — two example packages, Changesets, CI. |
| `oss` | — | Full open-source library — coverage, CodeQL, Codecov, Renovate, Changesets. |
| `minimal` | — | Bare TS library — tsup only, no tests/lint/CI. |
| `full` | — | Everything on — library + CLI, all workflows and extras. |

<!-- PRESETS:END -->

**Team profiles:** save a partial config as `packkit.config.json` (or any file) and reuse it with `npx create-packkit my-lib --from ./packkit.config.json` — flags still override the file.

## For AI agents & automation

Packkit is safe to drive non-interactively — every option is a flag, so no prompts are needed. Agents can introspect the whole interface as JSON:

```sh
npx create-packkit --schema      # all options, presets, and aliases as JSON
npx create-packkit my-lib ts-lib --no-install --no-git   # deterministic scaffold
```

There's also an [`llms.txt`](llms.txt) (served at [danmat.github.io/create-packkit/llms.txt](https://danmat.github.io/create-packkit/llms.txt)) describing the commands for LLMs.

**MCP server** — [`packkit-mcp`](mcp) exposes Packkit as a native [Model Context Protocol](https://modelcontextprotocol.io) tool (schema / preview / scaffold). Add to your agent's MCP config:

```json
{ "mcpServers": { "packkit": { "command": "npx", "args": ["-y", "packkit-mcp"] } } }
```

## How it works

Packkit is a pure `config → { files }` **core** that runs in both Node and the browser:

- the **CLI** writes the files to disk, runs `git init`, and installs dependencies;
- the **web configurator** zips the same files client-side (no server).

Both drive from one options schema ([`src/core/options.js`](src/core/options.js)), so the CLI and the web page always stay in sync.

## Staying fresh

Two GitHub Actions keep the templates honest:

- **Dependency freshness** — a weekly check flags any version Packkit writes into generated projects that's fallen a major behind (versions Dependabot can't see), and opens an issue.
- **Integration** — on any change to generation logic or a template dependency, it generates every preset, installs it, and runs its real checks (build/test/lint, and actually starts services) — so an update can't silently break the projects you'd get.

## License

[MIT](LICENSE) © DanMat
