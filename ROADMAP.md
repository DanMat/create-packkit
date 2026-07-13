# Roadmap

Planned and considered features for Packkit. Not commitments — a backlog to pull from. PRs and 👍s welcome.

## Shipped
- Core `config → files` engine (Node + browser)
- CLI wizard + presets + non-interactive flags
- Web configurator with client-side zip download
- Targets: **library**, **CLI**, **React component library**
- Bundlers: tsup, tsdown, unbuild, rollup, none · Tests: Vitest, Jest, node:test
- Lint: ESLint+Prettier, Biome, oxlint · Hooks: simple-git-hooks, husky, lefthook
- Release: Changesets, release-it, np · GitHub Actions: CI, npm publish (provenance), Pages, CodeQL, Codecov, stale
- Renovate/Dependabot · community files · AGENTS.md + CLAUDE.md · VS Code

## Next up
- [ ] **Defaults refresh** — consider `tsdown` and `Biome` as the recommended defaults as they stabilize.
- [ ] **Storybook option** for React component libraries (stories + a Pages-deployed catalog).
- [ ] **More frameworks** — Vue and Svelte component libraries (same peer-dep model as React).
- [ ] **React app target** — a Vite SPA starter (distinct from the component-library target; overlaps create-vite, so opt-in).
- [ ] **Monorepo target** — pnpm/turbo workspaces with multiple packages.
- [ ] **Node service preset** — a small HTTP service (Hono/Fastify) with Dockerfile + CI.
- [ ] **Config file** — read defaults from `packkit.config.json` / a saved profile.
- [ ] **Full CLI flag parity** — expose every web option as a flag so the copied command reproduces the exact config (workflows, extras, deps).
- [ ] **tsup entry globbing** and multiple entry points.
- [ ] **`npm create packkit` update check** — nudge when a newer version exists.

## Presets
Current: `ts-lib`, `js-lib`, `ts-cli`, `cli`, `react-lib`, `react-lib-js`, `oss`, `minimal`, `full`.
Ideas: `vue-lib`, `svelte-lib`, `monorepo`, `node-service`.

## Ideas / maybe
- Interactive web "diff against my repo" mode
- Import an existing package.json to pre-fill the configurator
- Badges block generator for the README
