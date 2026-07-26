# Architecture

Packkit is a project-generation engine with several front ends. The value of
that separation only holds if the layers stay distinct, so they're written down
here as rules rather than left as an accident of the current code.

```
          ┌── CLI ──┐  ┌─ web configurator ─┐  ┌─ MCP ─┐  ┌─ host apps ─┐
          │  (bin)  │  │   (docs, bundled)  │  │ (mcp) │  │  (embedded) │
          └────┬────┘  └──────────┬─────────┘  └───┬───┘  └──────┬──────┘
               │                  │                │            │
               └──────────────────┴────── adapters ┴────────────┘
                                          │
                              ┌───────────▼───────────┐
                              │     Embedded API      │  src/embedded
                              │  resolve · generate · │
                              │   extend · write      │
                              └───────────┬───────────┘
                                          │
                              ┌───────────▼───────────┐
                              │        Core           │  src/core
                              │  config → { files }   │
                              │   pure, no side       │
                              │   effects, browser-   │
                              │   safe                │
                              └───────────────────────┘
```

## Principles

1. **The core never performs side effects.** `src/core` is a pure
   `config → { files }` function. It runs in Node and the browser, makes no
   network calls, touches no filesystem, and spawns no processes. Everything it
   returns is data.

2. **The embedded API is the only supported programmatic surface.** `src/embedded`
   is what other code builds on: `resolveProjectConfig`, `createProject`,
   `extendProject`, `writeGeneratedProject`, and the definition/digest/contract
   helpers. It's typed (`types/`) and versioned. Reaching past it into
   `src/core/**` internals is unsupported and may break without a major bump.

3. **The CLI is an adapter over the embedded API.** `bin`/`src/cli` resolves and
   generates through the embedded pipeline, then adds the side effects the
   embedded API deliberately never performs — `git init`, dependency install,
   creating the remote. It does not generate files by itself.

4. **The web configurator is an adapter over the core.** `docs/` bundles
   `src/core` directly (`build:web`) and runs it client-side to preview and zip a
   project. Same generation, no server.

5. **MCP is an adapter over the core + scaffold helpers.** `mcp/` exposes
   generation as Model Context Protocol tools, importing `create-packkit/core`
   and `create-packkit/scaffold`.

6. **Future providers never bypass the embedded API.** Any deployment or
   provisioning integration (Netlify, AWS, a portal) consumes the embedded API
   like any other host. Provider-specific logic lives in the host, never in
   Packkit — which is why the deployment contract is provider-neutral.

## Why this matters

Because every surface resolves and generates through one pipeline, they all
share the same normalization diagnostics, collision handling, and path safety.
A fix to any of those benefits the CLI, the web page, MCP, and embedding hosts
at once — and no surface can quietly diverge into its own behavior.

The only thing that legitimately differs between surfaces is what they do
*around* generation: the CLI installs and pushes, the web page zips, a host app
deploys. Those are adapters. The engine in the middle is shared.
