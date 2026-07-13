# Roadmap

Planned and considered features for Packkit. Not commitments — a backlog to pull from. PRs and 👍s welcome.

## Shipped (1.0)
- Core `config → files` engine (runs in Node **and** the browser)
- CLI wizard + 17 presets + full non-interactive flag parity + `--from` profiles (`packkit.config.json`)
- Web configurator: client-side zip download + reproducible `npx` command + preset gists
- **Targets**: library · CLI · HTTP service (Hono) · app (Vite SPA)
- **Frameworks**: React · Vue · Svelte — component libraries **and** apps
- **Storybook** for component libraries (Vite builder) + optional Pages deploy of the catalog
- Bundlers: tsup · tsdown · unbuild · rollup · Vite · none — optional **minify**
- Tests: Vitest · Jest · node:test · Testing Library per framework
- Lint: ESLint+Prettier · Biome · oxlint · Hooks: simple-git-hooks · husky · lefthook
- Release: Changesets · release-it · np · GitHub Actions: CI · npm publish (provenance) · Pages · CodeQL · Codecov · stale
- Renovate/Dependabot · community files · **AGENTS.md + CLAUDE.md** · VS Code · README badges · update notifier
- Package managers: npm · pnpm · yarn · bun

**On defaults:** we keep **tsup + ESLint/Prettier + Vitest + Changesets** as the conservative, best-supported defaults. `tsdown`, `Biome`, and `oxlint` are one click away for those who want them — we'll revisit the defaults as those tools' ecosystems mature.

## Next up
- [ ] **Monorepo target** — pnpm/turbo workspaces with multiple packages.
- [ ] **Vue/Svelte app scaffolds with a router** (currently minimal SPAs).
- [ ] **Multiple entry points** — `exports` subpaths and per-entry builds.
- [ ] **E2E option** — Playwright for apps.

## Ideas / maybe
- Import an existing `package.json` to pre-fill the web configurator
- Save/share a config as a URL (encode the selection in the query string)
- More service frameworks (Fastify/Express) alongside Hono
- Postinstall doctor: check Node/pm versions match `engines`

<!-- Items added from real-world demand / gaps get appended here. -->
