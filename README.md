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

## What you can pick

| Area | Options |
|---|---|
| **Language** | TypeScript (strict) · JavaScript (ESM) |
| **Module format** | ESM · CJS · dual (proper `exports` map) |
| **Target** | Library · CLI tool · both |
| **Bundler** | tsup · tsdown · unbuild · rollup · none (tsc) |
| **Tests** | Vitest · Jest · node:test · none (+ coverage) |
| **Lint/format** | ESLint + Prettier · Biome · oxlint · none |
| **Git hooks** | simple-git-hooks · husky + lint-staged · lefthook · none |
| **Release** | Changesets · release-it · np · none |
| **GitHub Actions** | CI · npm publish (provenance) · Pages · CodeQL · Codecov · stale bot |
| **Deps** | Renovate · Dependabot · none |
| **Repo** | LICENSE · community files · **AGENTS.md + CLAUDE.md** · VS Code · `.editorconfig` |
| **Package manager** | npm · pnpm · yarn · bun |

## Presets

`ts-lib` · `js-lib` · `ts-cli` / `cli` · `minimal` · `full` — named bundles of the options above.

## How it works

Packkit is a pure `config → { files }` **core** that runs in both Node and the browser:

- the **CLI** writes the files to disk, runs `git init`, and installs dependencies;
- the **web configurator** zips the same files client-side (no server).

Both drive from one options schema ([`src/core/options.js`](src/core/options.js)), so the CLI and the web page always stay in sync.

## License

[MIT](LICENSE) © DanMat
