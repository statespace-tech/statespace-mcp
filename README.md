# statespace-mcp

[![Test Suite](https://github.com/statespace-tech/statespace-mcp-server/actions/workflows/test.yml/badge.svg)](https://github.com/statespace-tech/statespace-mcp-server/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-007ec6?style=flat-square)](https://github.com/statespace-tech/statespace-mcp-server/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/statespace-mcp?style=flat-square)](https://www.npmjs.com/package/statespace-mcp)
[![Discord](https://img.shields.io/discord/1323415085011701870?label=Discord&logo=discord&logoColor=white&color=5865F2&style=flat-square)](https://discord.gg/rRyM7zkZTf)
[![X](https://img.shields.io/badge/Statespace-black?style=flat-square&logo=x&logoColor=white)](https://x.com/statespace_tech)

MCP server for [Statespace](https://statespace.com) apps.

## Usage

Add to your MCP client config:

```json
"statespace": {
  "command": "npx",
  "args": ["statespace-mcp", "https://your-app.statespace.app"]
}
```

That's it. The server connects to your deployed Statespace app over HTTP and exposes two tools:

- `read_page` — read any file from the app (start with `README.md`)
- `run_command` — execute a command declared in a page's YAML frontmatter

For private apps, pass your API token via `STATESPACE_TOKEN`:

```json
"statespace": {
  "command": "npx",
  "args": ["statespace-mcp", "https://your-app.statespace.app"],
  "env": {
    "STATESPACE_TOKEN": "your-token-here"
  }
}
```

## Requirements

- Node.js 18+
- A deployed Statespace app URL (http or https)
