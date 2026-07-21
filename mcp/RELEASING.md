# Releasing `packkit-mcp`

How the MCP server gets published, and to every place it's listed. Written down
because several of these steps fail in non-obvious ways (see [Gotchas](#gotchas)).

## Where it's listed

| Surface | Identifier | Updated by |
| --- | --- | --- |
| **npm** | `packkit-mcp` | `release.yml` (automatic) or `npm publish` |
| **Official MCP registry** | `io.github.DanMat/packkit-mcp` | `mcp-publisher publish` (manual) |
| **Glama** | [`DanMat/create-packkit`](https://glama.ai/mcp/servers/DanMat/create-packkit) | Admin → Dockerfile → **Build & Release** (manual) |
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

## What the Release workflow does

`Actions → Release` (workflow_dispatch, pick a bump) handles the **npm** side:

1. Bumps + publishes `create-packkit`.
2. Re-pins `packkit-mcp`'s `create-packkit` dependency and patch-bumps it **only
   when the create-packkit MAJOR changes** (the caret already tracks minors/patches).
3. Publishes `packkit-mcp` **only if that version isn't on npm yet**.
4. Tags and creates the GitHub Release.

**It does not touch `server.json`, the official registry, or Glama.** So whenever
`mcp/package.json`'s version changes, do the follow-ups below or those listings
go stale.

## Releasing a new `packkit-mcp` version

```bash
# 1. Bump, keeping all four values in sync (see the table above)
#    mcp/package.json version · server.json version + packages[0].version · mcp/server.js
# 2. Publish to npm (skip if the Release workflow already did it)
cd mcp && npm publish && cd ..

# 3. Push it to the official MCP registry (run from the repo root — reads ./server.json)
mcp-publisher login github     # once per machine/session; browser device-code flow
mcp-publisher publish

# 4. Verify
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=packkit" | python3 -m json.tool
```

Then refresh **Glama**: Admin → **Dockerfile** → **Build** (test) → **Build & Release**.
Without a new release, Glama keeps serving the previous build.

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

## Possible improvement

`release.yml` could sync `server.json` and `mcp/server.js` whenever it bumps
`mcp/package.json`, so only the registry publish and Glama rebuild stay manual.
