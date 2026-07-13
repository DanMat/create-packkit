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

## From real-world demand (2026 research)
The current "is my package correct?" and publishing best-practices that a serious library scaffolder should offer:

- [ ] **Package-correctness checks** — optional `publint` + `@arethetypeswrong/cli --pack` step (in CI and/or `prepublishOnly`). These catch broken `exports`/`main`/`module` and mis-resolved `.d.ts` that npm itself doesn't. *(High value, low effort — the 2026 standard.)*
- [ ] **JSR publishing** — TypeScript-first, ESM-only registry with automatic Sigstore provenance and no build-step requirement. Add `jsr.json` + a publish workflow as an alternative/companion to npm. *(Emerging demand.)*
- [ ] **Knip** — unused files/dependencies/exports detection before publish (as create-typescript-app does).
- [ ] **Monorepo target** — pnpm/turbo workspaces + Changesets; the battle-tested 2026 stack. Guardrail: only worth it with ≥2 packages sharing code.
- [ ] **ESM-only guidance** — surface "ESM-only" as the recommended default for new libraries (Node 23+ can `require()` ESM), while keeping dual as an option.
- [ ] **`size-limit`** — bundle-size budget check for libraries.

