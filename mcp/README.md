# packkit-mcp

An [MCP](https://modelcontextprotocol.io) server for **[Packkit](https://github.com/DanMat/create-packkit)** — let AI agents (Claude Desktop, Cursor, Windsurf, …) scaffold modern npm packages, CLIs, HTTP services, and front-end apps as a native tool.

## Tools

- **`packkit_schema`** — every option, preset, and alias as JSON (call first to learn the interface).
- **`packkit_preview`** — the files a config would generate, without writing anything.
- **`packkit_scaffold`** — generate a project to disk (optional `git init` + install).

## Setup

Add to your MCP client config (e.g. Claude Desktop's `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "packkit": {
      "command": "npx",
      "args": ["-y", "packkit-mcp"]
    }
  }
}
```

Then ask your agent things like *"scaffold a React component library called ui with Storybook"* or *"preview a Hono service named api"*.

Also listed on the [official MCP registry](https://registry.modelcontextprotocol.io) as `io.github.DanMat/packkit-mcp` and on [Glama](https://glama.ai/mcp/servers/DanMat/create-packkit).

## Releasing

Publishing a new version touches npm, the official MCP registry and Glama — see **[RELEASING.md](RELEASING.md)**.

## License

[MIT](https://github.com/DanMat/create-packkit/blob/main/LICENSE) © DanMat
