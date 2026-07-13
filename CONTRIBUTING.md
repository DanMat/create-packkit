# Contributing to Packkit

Thanks for helping improve Packkit!

## Setup

```sh
npm install
npm test          # runs the core generation tests (node:test)
node bin/cli.js --preset full demo --no-install --no-git   # try the CLI
npm run build:web # rebuild the browser bundle (docs/packkit-core.js)
```

## Architecture

- `src/core/` — a **pure, dependency-free** `generate(config) → { files }` core. It must stay browser-safe (no `node:` built-ins), because the web configurator imports it.
- `src/core/features/` — one module per feature. Each returns `{ files, pkg }`; the generator merges them and finalizes `package.json`.
- `src/core/options.js` — the single options schema that drives **both** the CLI wizard and the web form. Add new options here first.
- `src/cli/` — Node-only: the wizard, arg parsing, and writing to disk.
- `docs/` — the web configurator (imports the esbuild-bundled core).

## Adding a feature/option

1. Add the option to `src/core/options.js` (choices + default).
2. Handle it in the relevant feature module under `src/core/features/`.
3. Add/extend a test in `test/core.test.js`.
4. Run `npm run build:web` so the web bundle stays in sync.

## Pull requests

Open a PR against `main`. Please keep the core free of Node built-ins, and make sure `npm test` passes.
