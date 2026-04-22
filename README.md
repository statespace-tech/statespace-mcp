# statespace

[![npm](https://img.shields.io/npm/v/statespace?style=flat-square)](https://www.npmjs.com/package/statespace)
[![License](https://img.shields.io/badge/license-MIT-007ec6?style=flat-square)](https://github.com/statespace-tech/statespace-mcp-server/blob/main/LICENSE)
[![Discord](https://img.shields.io/discord/1323415085011701870?label=Discord&logo=discord&logoColor=white&color=5865F2&style=flat-square)](https://discord.gg/rRyM7zkZTf)
[![X](https://img.shields.io/badge/Statespace-black?style=flat-square&logo=x&logoColor=white)](https://x.com/statespace_tech)

Search documentation indexed from [llms.txt](https://llmstxt.org/) sites — from the terminal, from your AI assistant, or over HTTP.

## CLI

```bash
npx statespace search "redis connection pooling"
npx statespace search "authentication" --site upstash.com
npx statespace search "rate limiting" --limit 20
```

**Options**

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--site <site>` | `-s` | — | Restrict to a specific site (name, domain, or URL) |
| `--limit <n>` | `-l` | 10 | Max results |
| `--url <url>` | `-u` | `http://localhost:3000` | Backend API base URL |

## MCP

Add to your MCP client config (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "statespace": {
      "command": "npx",
      "args": ["statespace", "mcp"]
    }
  }
}
```

For a remote backend:

```json
{
  "mcpServers": {
    "statespace": {
      "command": "npx",
      "args": ["statespace", "mcp", "--url", "https://your-backend.example.com"]
    }
  }
}
```

To run as an SSE server instead of stdio (useful for remote or multi-client deployments):

```bash
npx statespace mcp --transport sse --port 4000
```

**Tool: `search`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | yes | — | Search query |
| `limit` | integer | no | 10 | Max results |
| `site` | string | no | — | Restrict to a specific site (name, domain, or URL) |

## HTTP

The backend exposes a single endpoint:

```
GET /search?q=<query>[&limit=<n>][&site=<site>]
```

```bash
curl "http://localhost:3000/search?q=redis+connection+pooling"
curl "http://localhost:3000/search?q=authentication&site=upstash.com&limit=5"
```

**Response**

```json
[
  {
    "url": "https://upstash.com/docs/llms.txt",
    "site": "Upstash",
    "title": "Upstash Docs",
    "score": 0.8321
  }
]
```

Without `site`, returns one result per matching site. With `site`, returns individual pages within that site.

## Requirements

Node.js 18+

## Community

- **Discord**: [discord.gg/rRyM7zkZTf](https://discord.gg/rRyM7zkZTf)
- **X**: [@statespace_tech](https://x.com/statespace_tech)
- **Issues**: [GitHub Issues](https://github.com/statespace-tech/statespace-mcp-server/issues)

## License

This project is licensed under the terms of the MIT license.
