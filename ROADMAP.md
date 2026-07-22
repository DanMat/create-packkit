# Roadmap

Planned and considered features for Packkit. Not commitments — a backlog to pull from. PRs and 👍s welcome.

## Shipped (through 2.0)

**2.0 — ESM-only by default** _(breaking)_
- New libraries default to **ESM-only** output (Node 20.19+/22.12+ can `require()` ESM), matching where the ecosystem is heading — smaller `exports`, no `.cjs`/`.d.cts`, one build format. **Dual (ESM + CJS)** stays one click / `--module dual` away, and CJS-only is still there. Library presets (`ts-lib`, `js-lib`, `react-lib`, `oss`, `full`, `minimal`) follow the new default.


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

**Node versions:** offered lines + the default (Active LTS) are derived from Node's own release schedule + dist index (`scripts/update-node-versions.mjs`, refreshed weekly), so LTS/Current tracking never needs hand-editing.

## Next up (working order)

- [x] ~~**E2E option — Playwright** for the app targets (config + example spec + CI job).~~ — **Shipped (2.1).** `--e2e` on any app.
- [x] ~~**`size-limit`** — bundle-size budget check for libraries (config + CI).~~ **Shipped (2.3).** `--size-limit`; `.size-limit.json` + `size` script + CI gate.
- [x] ~~**Import an existing `package.json`** to pre-fill the web configurator.~~ **Shipped (2.3).** Detects name/description/author/type + `bin`→cli.
- [x] ~~**Share a config as a URL** — encode the selection in the query string.~~ **Shipped (2.3).** "Share link" button; the diff-from-defaults is encoded and restored on load.
- [x] ~~**More service frameworks** — Fastify / Express alongside Hono.~~ **Shipped (2.4).** `--server <hono|fastify|express>`; framework-aware app/server/test.
- [x] ~~**Postinstall doctor** — check the local Node / package-manager versions match `engines`, warn if not.~~ **Shipped (2.5).** `--doctor`; `npm run doctor` (+ postinstall for private projects), warn-only.
- [x] ~~**Create the repo, not just the folder**~~ — **Shipped (2.8).** `--github` provisions the remote and pushes via the `gh` CLI, so Packkit never handles a token (`glab` later); `--git-remote <url>` covers Bitbucket/Gitea/self-hosted. Opt-in, **private** unless `--public`. Resolving the URL *before* generating also fixes badge accuracy — `package.json` links and CI badges now point somewhere real from the first commit. Exposed over MCP too (`github`, `public`).
- [x] ~~**Scaffold into a non-empty directory**~~ — **Shipped (2.8).** `--merge` writes what's absent and never overwrites; collisions are kept and reported. A directory holding only `.git` now counts as empty, so the create → clone → scaffold flow works without any flag — that abort was what forced the backup/move/restore dance.
- [ ] **Vue/Svelte app scaffolds with a router** — the app targets are minimal SPAs; add vue-router / SvelteKit-style routing (plus a React Router option).
- [ ] **Multiple entry points** — `exports` subpaths (e.g. `./utils`) with per-entry builds (tsup multi-entry).

## Ideas from real-world research (2026)
_From mining pain points across create-typescript-app, tsup, Changesets, create-t3-app, and current "publish an npm package" guides. Ordered by demand × fit._

- [x] ~~**Type-safe env validation** — `src/env.ts` (Zod) + `.env.example`; fail fast on bad config.~~ **Shipped (2.2).** `--env` for services/CLIs.
- [x] ~~**Snapshot / canary releases** — publish `x.y.z-canary.<hash>` to a dist-tag.~~ **Shipped (2.2).** `--canary` (Changesets); manual-dispatch workflow.
- [x] ~~**Production Dockerfile for services** — multi-stage, slim, non-root, `.dockerignore`, healthcheck.~~ **Shipped (2.2).** Hardened the Hono service Dockerfile (prod-only deps stage, `USER node`, HEALTHCHECK).
- [x] ~~**Sourcemaps + declaration maps** — ship source + maps so consumers debug into original code.~~ **Shipped (2.2).** On by default for publishable libs (`--no-sourcemaps` to opt out).
- [ ] **Docs site generator** — Starlight / VitePress / Nextra + Pages deploy (reuses existing Pages plumbing).
- [ ] **API docs (TypeDoc)** · **CSS/asset handling for component libs** (`sideEffects`) · **runnable examples + StackBlitz/CodeSandbox buttons** · **all-contributors** · **CLI ergonomics kit** (commander/citty + testable handlers) · **repo settings-as-code** (`.github/settings.yml`) · **benchmarks** (tinybench/mitata) · **cspell + markdownlint** · **OpenSSF Scorecard + SLSA** · **target-aware `moduleResolution` defaults**.

## From field use (2026)
_First unsolicited review from an agent that used Packkit to build a real internal full-stack tool. Verdict: "a scaffold, not a framework" — genuinely useful for day-zero plumbing, ~neutral once the domain work starts. That framing is fair and worth designing to, rather than against._

- [x] ~~**Full-stack monorepo preset**~~ — **Shipped (2.9).** `fullstack` preset (alias `fs`) / `--monorepo-layout fullstack`. Verified by installing the generated workspace and running the real toolchain: build, typecheck and tests all green, and the production server serves the web build on one port. Original note: `web` + `server` + `shared` in one shot, workspace deps pre-wired, prod "server serves web dist" pattern. The `monorepo` preset hardcodes two *library* packages (`packages/core` + `packages/utils`, `packages/*` only) with no `apps/`, so a web+API repo means scaffolding pieces separately and merging them by hand — the opposite of one command. The individual parts already exist (`node-service`, `react-app`); it's the **composition** that's missing. Highest-value item here.
- [x] ~~**`packkit.json` provenance**~~ — **Shipped (2.9).** Records generator version, preset, and only the settings that differ from the defaults. No timestamps, so generation stays a pure function of the config. Original note: record preset, version, and flags used. Today Packkit leaves **zero footprint**, so a project can't answer "what did I start from?", can't diff against template updates, and has no upgrade path. This is the whole "no ongoing relationship" complaint, and it's the prerequisite for any future `packkit upgrade`.
- [ ] **One-line MCP install** — mostly closed already: `packkit-mcp` now resolves from the official registry, which is exactly the gap ("wasn't configured in Cursor, so we fell back to `npx`"). What's left is a Cursor/VS Code deep-link install button in the READMEs so the agent-native path is the obvious one.
- [x] ~~**Preset discovery for agents**~~ — **Shipped (2.9).** MCP tool descriptions now steer agents to `packkit_schema` first and describe `packkit_preview` as the structure-preview step, which is what the reviewer was looking for under a name that never existed. Original note: the review asked for `preview_project_structure` as a default pre-scaffold step. That tool exists, as `packkit_preview` — misremembering the name *is* the finding. Steer agents in the tool descriptions ("call `packkit_schema` first") so wrong-preset detours stop happening.
- [ ] **Post-scaffold checklist** — "you chose X, here's what to customize next" for auth, env, deployment. Partially exists (the CLI already prints next steps and framework-specific advice); extend rather than build.

**Two we should not act on as written.** The *"Node 22 vs 24 friction"* is the `--doctor`/engine preflight working correctly — it refuses to scaffold a project whose eslint/vite/vitest can't run, with the exact `nvm install` fix. Removing that trades one loud error for a broken install. Worth making the message more actionable, not softer. And *"overwrite risk"* in `--here` is inverted: it never overwrites, it hard-aborts — the fix is the merge mode above, not more guardrails.

## From architecture review (2026)
_Second external review, this one of the codebase rather than the experience. Ratings: architecture 8.5, engineering 8, product 7, OSS readiness 8, maintainability 7. Every claim below was checked against the code before being written down._

**The theme worth acting on: Packkit doesn't eat its own cooking.** It generates `publint` + are-the-types-wrong checks, strict TypeScript, and lint gates for other people's packages, then ships without any of them. `npm run check:pkg` is something Packkit writes for you, not something it runs on itself — and its own package would fail it.

- [ ] **Type declarations for the public API** — `exports` exposes `.`, `./core`, `./cli`, `./scaffold`, with **no `types`**. Programmatic consumers and the MCP server get nothing. JSDoc + `tsc --declaration` is enough; a rewrite isn't needed. Types wanted for `PackkitConfig`, the resolved config, `GenerateResult`, the file map, preset names, and scaffold results. **v3 requirement.**
- [ ] **Self-enforcement** — root scripts are `start, test, check:deps, integration, build:web, update:node, gen:reference, sync:mcp`. No lint, no format check, no typecheck. Add a `check` script running all of them, plus `tsc --allowJs --checkJs --noEmit` to catch API drift even while the source stays JS.
- [ ] **Validate generated paths at the writer** — `writeProject` joins each relative path onto the target and writes it. Fine while every feature is trusted first-party code; a security boundary the moment third-party features, community recipes, or MCP-supplied data can contribute paths. Reject absolute paths, `..` escapes, and post-normalization collisions **in the writer**, not per feature — before extensibility ships, not after.
- [ ] **Collision diagnostics** — `deepMerge` ends in `return source`, so when two features set the same `scripts.build` or `exports` key the last one silently wins. Additive fields (dependencies) should keep merging; `scripts`, `exports`, `bin`, `files` should report which features collided. Same for two features emitting the same file path.
- [ ] **Structured subprocess errors** — `run()` returns a boolean and discards stdout/stderr when quiet, so "install failed" can't distinguish a missing executable from a network error, an unconfigured git identity, or a rejected push. Return `{ ok, command, exitCode, stdout, stderr, category }`; the CLI can still print something friendly, while MCP callers get something actionable.
- [ ] **Windows command-execution tests** — `run()` and `capture()` both set `shell: true` on win32, where quoting and metacharacter handling change. Test repo slugs, descriptions, remote URLs, and paths containing spaces, `&`, quotes, pipes, parens, and Unicode. Prefer resolving the executable (or `.cmd`) over enabling the shell globally.
- [ ] **Test the packed tarball** — `npm pack`, install the tgz, then check every export path resolves, the shebang and exec bit survive, only intended files ship, and the core stays browser-safe. The `./scaffold` export added in 2.8 makes this sharper: it pulls `node:child_process` into the published surface.

### Architecture, once the gates are in

- [ ] **Staged resolution with diagnostics** — `normalizeConfig` now applies defaults, coerces conflicts, derives helpers, and encodes framework/target policy in one pass, and **silently** disables what it can't support. Split into ordered stages returning `{ config, changes[], warnings[], errors[] }` so "we turned Storybook off because this isn't a component library" is reported rather than inferred.
- [ ] **A resolved domain model** — the config carries ~16 derived booleans (`isReact`, `hasApp`, `publishable`, `usesVite`…) that can in principle contradict each other. Features should consume `resolved.targets` / `resolved.build` / `resolved.package` instead of re-interpreting raw selections.
- [ ] **Make feature ordering explicit** — features merge in array order, so order silently decides who wins. Give them ids, phases, `requires`, `conflictsWith`, and detect collisions rather than relying on position.
- [ ] **Pairwise combination testing** — the integration matrix covers presets, which are the *common* paths. The risk is cross-feature interaction (dual + Rollup + Jest + Biome). Generate a matrix where every option pair appears at least once.
- [ ] **Dependency version catalog** — template versions are embedded across feature modules. Centralize them with compatibility notes and a last-reviewed date; the freshness workflow already treats them as product data, this makes that explicit.
- [ ] **Unify monorepo and single-package generation** — `generate()` returns early for monorepos, and 2.9 added a second early return inside that. Modelling a project as workspaces (a plain package being a project with one) would stop features having to be implemented twice.

### The strategic one

- [ ] **`packkit upgrade`** — read `packkit.json`, generate the current recommended output in memory, diff it against the repo, and classify each difference: safe auto-update, user-modified, deprecated dependency, changed best practice, manual migration. Then emit a patch or a PR. **Both reviews independently landed on this**, and 2.9's provenance file was the prerequisite. It's what turns a one-time generator into something with a durable relationship to the repos it creates — one-time scaffolders are easy to replace; a tool that keeps repos current isn't.

### Checked and not acted on

- **"Add shareable configuration URLs"** — already shipped in 2.3. There's a Share link button that encodes the diff-from-defaults and restores it on load.
- **"Add privacy-preserving product analytics"** — this is a static GitHub Pages site with no backend. Analytics means adding third-party tracking to a developer tool, which is a values call rather than a task. Deliberately parked.
- **Positioning: the two reviews disagree.** The field review's top ask was a full-stack monorepo preset (shipped in 2.9); this one argues apps dilute a product whose coherent domain is packages/CLIs/services. Both are reasonable. Current stance: packages, CLIs and services stay the centre of gravity — that's where packaging, exports, provenance and release correctness compound — and `fullstack` stays a supported track rather than the start of chasing framework starters.

## Agent / automation reach
- [x] ~~Non-interactive CLI + flag parity · `--schema` + `llms.txt` · preset shortcuts · MCP server~~ — **Shipped.**
- [ ] **Publicize** — dev.to / Show HN post, `awesome-*` list PRs, npm keywords, register the `llms.txt`. _(Drafts ready in `marketing/`; needs the author's accounts.)_

## Ideas / maybe
- Solid / Qwik / Astro targets
- A "migrate an existing repo" mode (like create-typescript-app's)
- Web "diff against my repo" preview
