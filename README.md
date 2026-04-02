# statespace-mcp

MCP server for [Statespace](https://statespace.com) apps.

## Usage

Add to your MCP client config:

```json
"statespace": {
  "command": "npx",
  "args": ["statespace", "mcp", "https://your-app.statespace.app"]
}
```

That's it. The server connects to your deployed Statespace app over HTTP and exposes two tools:

- `read_page` — read any file from the app (start with `README.md`)
- `run_command` — execute a command declared in a page's YAML frontmatter

## Requirements

- Node.js 18+
- A deployed Statespace app URL (http or https)
