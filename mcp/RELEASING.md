# Releasing `packkit-mcp`

How the MCP server gets published, and to every place it's listed. Written down
because several of these steps fail in non-obvious ways (see [Gotchas](#gotchas)).

## Where it's listed

| Surface | Identifier | Updated by |
| --- | --- | --- |
| **npm** | `packkit-mcp` | `release.yml` — automatic |
| **Official MCP registry** | `io.github.DanMat/packkit-mcp` | `release.yml` — automatic |
| **Glama** | [`DanMat/create-packkit`](https://glama.ai/mcp/servers/DanMat/create-packkit) | Admin → Dockerfile → **Build & Release** — **manual** |
| **mcpservers.org** | submitted once | — |
| **awesome-mcp-servers** | README entry + Glama score badge | — |

Clients (Cursor, VS Code, Glama…) resolve the install command from the **official
registry**, so that one matters most.

## Three files must agree

| File | Field | Must equal |
| --- | --- | --- |
| `mcp/package.json` | `version` | the npm version being published |
| `mcp/package.json` | `mcpName` | `server.json` → `name` **exactly** (case-sensitive) |
| `server.json` | `version`, `packages[0].version` | `mcp/package.json` → `version` |
| `mcp/server.js` | `new Server({ version })` | `mcp/package.json` → `version` |

`npm run sync:mcp` enforces this — it rewrites `server.json` and `mcp/server.js`
from `mcp/package.json`, and exits non-zero if `mcpName` and `server.json`'s
`name` disagree. The Release workflow runs it on every release.

## What the Release workflow does

`Actions → Release` (workflow_dispatch, pick a bump) now handles everything
except Glama:

1. Bumps + publishes `create-packkit`.
2. Re-pins `packkit-mcp`'s `create-packkit` dependency and patch-bumps it **only
   when the create-packkit MAJOR changes** — see [why](#why-packkit-mcp-isnt-bumped-every-release).
3. Runs `scripts/sync-mcp-version.mjs` so `server.json` and `mcp/server.js` track
   `mcp/package.json`'s version (and fails the release if `mcpName` and
   `server.json`'s `name` ever drift apart).
4. Publishes `packkit-mcp` to npm **only if that version isn't there yet**.
5. Publishes the entry to the **official MCP registry** via GitHub OIDC
   (`mcp-publisher login github-oidc` — no secrets), gated on step 4 actually
   publishing, because the registry verifies npm ownership.
6. **Refreshes `mcp/package-lock.json`** against the just-published
   `create-packkit` and pushes it.
7. Tags and creates the GitHub Release.

**Only Glama stays manual** — its build/release is an admin-panel action with no
public write API (their API is read-only).

### Why `packkit-mcp` isn't bumped every release

`packkit-mcp` depends on `create-packkit` by caret (`^X.y.z`), so `npx -y
packkit-mcp` already resolves the newest matching version at install time.
Republishing it for every create-packkit patch would be version churn with no
user-visible effect.

What *does* go stale is `mcp/package-lock.json`: builds that run `npm ci` —
**Glama's, notably** — install the exact version it pins, not the newest. (The
lockfile isn't in the npm tarball, so it only affects git-clone builds.) That's
why step 6 refreshes it every release instead of bumping the package version.

## Releasing by hand

Only needed for an out-of-band `packkit-mcp` change (the workflow covers the
normal path):

```bash
# 1. Bump mcp/package.json, then sync the other two version sites
npm run sync:mcp

# 2. Publish to npm — the registry verifies against it, so this comes first
cd mcp && npm publish && cd ..

# 3. Push the entry to the official registry (run from the repo root; reads ./server.json)
mcp-publisher login github     # once per machine; browser device-code flow
mcp-publisher publish

# 4. Verify
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=packkit" | python3 -m json.tool
```

Either way, finish by refreshing **Glama**: Admin → **Dockerfile** → **Build**
(test) → **Build & Release**. Without a new release Glama keeps serving the
previous build — and since it clones the latest `main`, it picks up the
refreshed lockfile at the same time.

### Glama build config (known-good)

Glama **generates its own Dockerfile** from the Admin form — `mcp/Dockerfile` is
for local/other hosts and is *not* what Glama builds. These values work:

| Field | Value |
| --- | --- |
| Base image | `debian:trixie-slim` |
| Node.js version | `26` |
| Build steps | `["npm ci --omit=dev"]` |
| CMD arguments | `["node", "server.js"]` |
| Env vars schema | `{"properties":{},"required":[],"type":"object"}` |
| Placeholder parameters | `{}` |
| Pinned commit SHA | *(empty — tracks latest)* |

Glama wraps CMD as `mcp-proxy -- node server.js` and runs it from `/app/mcp`
(it detects the subfolder automatically). A build passes when the server starts
and answers an introspection request — the tool schemas appear in *Instance logs*.

## Gotchas

1. **The registry namespace is case-sensitive.** It's `io.github.DanMat`, matching
   the GitHub username's capitalisation. Lowercase gives
   `403 … You have permission to publish: io.github.DanMat/*`.
2. **`mcpName` proves npm ownership**, so it must match `server.json`'s `name`
   byte-for-byte. A published npm version can't be overwritten — if `mcpName` is
   wrong you must publish a *new* version with it corrected.
3. **`server.json` `description` must be ≤ 100 characters**, or the publish fails
   with `422 … expected length <= 100`.
4. **Publish to npm *before* `mcp-publisher publish`** — the registry fetches the
   npm package to verify `mcpName`, so it rejects a version that isn't up yet.
5. **`npm publish` returning `E404` usually means auth, not a missing package.**
   Check `npm whoami`; a `401` there means the token in `~/.npmrc` expired — run
   `npm login` (or `npm logout && npm login`).
6. **awesome-mcp-servers requires a *passing* Glama listing** plus the score badge
   in the entry:
   `[![DanMat/create-packkit MCP server](https://glama.ai/mcp/servers/DanMat/create-packkit/badges/score.svg)](https://glama.ai/mcp/servers/DanMat/create-packkit)`
7. **`glama.json` only carries `maintainers`** — it's the ownership/claim hook.
   Everything else (name, description, build) is configured in Glama's admin panel
   after claiming.

## Not automated

**Glama's build & release.** Everything else (npm, the official registry, the
version sync, the lockfile refresh) runs in `release.yml`. Glama exposes only a
read API, so after a release open Admin → Dockerfile → **Build & Release**.
Its listing metadata still refreshes on its own, since Glama syncs from the
official registry.
