# Roadmap

Planned and considered features for Packkit. Not commitments — a backlog to pull from. PRs and 👍s welcome.

## Shipped (through 1.5)

**Generation**
- Core `config → files` engine (runs in Node **and** the browser)
- Targets: library · CLI · HTTP service (Hono) · app (Vite SPA)
- Frameworks: React · Vue · Svelte — component libraries **and** apps
- **Monorepo** target — pnpm/npm/yarn workspaces + Turborepo + Changesets + linked example packages
- Bundlers: tsup · tsdown · unbuild · rollup · Vite · none — optional **minify**
- Tests: Vitest · Jest · node:test · Testing Library per framework
- Lint: ESLint+Prettier · Biome · oxlint · Hooks: simple-git-hooks · husky · lefthook
- Release: Changesets · release-it · np · **Storybook** for component libs (+ Pages deploy)
- Package-correctness (`publint` + are-the-types-wrong) · **Knip** · **JSR** publishing
- GitHub Actions: CI · npm publish (provenance) · Pages · CodeQL · Codecov · stale
- Renovate/Dependabot · community files · **AGENTS.md + CLAUDE.md** · VS Code · README badges
- Package managers: npm · pnpm · yarn · bun

**Surfaces & DX**
- CLI wizard + 18 presets + short aliases + full non-interactive flag parity
- One-command scaffold (`--recommended`; flags imply non-interactive) + `--from` profiles
- Web configurator: client-side zip download + reproducible one-shot command + preset gists
- Agent-native: `--schema` (JSON), `llms.txt`, and an **MCP server** (`packkit-mcp`)

**Staying honest**
- **Template-dependency freshness** — weekly Action flags any version we write into generated projects that falls a major behind (what Dependabot can't see) and opens/auto-closes an issue
- **End-to-end integration matrix** — generates every preset + tooling variant, installs, and runs its real checks (build/test/lint, starts services) on any change to generation logic or deps
- **All template deps refreshed to current** (Vite 8, Vitest 4, ESLint 10, Storybook 10, React 19, jsdom 29, Biome 2, Jest 30, …) — verified green by the matrix. Intentional holds: `typescript` (5.9, pending typescript-eslint TS 7 support) and `knip` (5, oxc-parser native-binding crash in 6).

**On defaults:** tsup + ESLint/Prettier + Vitest + Changesets stay the conservative, best-supported defaults; tsdown/Biome/oxlint are one click away.

## Next up

- [ ] **ESM-only guidance / default** — surface ESM-only as the recommended default for new libraries (Node 20.19+/22+ can `require()` ESM), keeping dual as an option. _If we flip the default, that's the natural **2.0** (a breaking change to default output)._
- [ ] **Vue/Svelte app scaffolds with a router** — the app targets are currently minimal SPAs; add vue-router / SvelteKit-style routing (matches the React Router option we should add too).
- [ ] **Multiple entry points** — `exports` subpaths (e.g. `./utils`) with per-entry builds (tsup multi-entry).
- [ ] **E2E option — Playwright** for the app targets (config + example test + CI job).
- [ ] **`size-limit`** — bundle-size budget check for libraries (config + CI).
- [ ] **Import an existing `package.json`** to pre-fill the web configurator (paste/upload → detect name/description/author/type).
- [ ] **Share a config as a URL** — encode the selection in the query string so a configured setup is linkable.
- [ ] **More service frameworks** — Fastify / Express alongside Hono.
- [ ] **Postinstall doctor** — check the local Node / package-manager versions match `engines`, warn if not.

## Agent / automation reach
- [x] ~~Non-interactive CLI + flag parity · `--schema` + `llms.txt` · preset shortcuts · MCP server~~ — **Shipped.**
- [ ] **Publicize** — dev.to / Show HN post, `awesome-*` list PRs, npm keywords, register the `llms.txt`. _(Drafts ready in `marketing/`; needs the author's accounts.)_

## Ideas / maybe
- Solid / Qwik / Astro targets
- A "migrate an existing repo" mode (like create-typescript-app's)
- Web "diff against my repo" preview
