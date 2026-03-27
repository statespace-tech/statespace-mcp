<br>

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/statespace-tech/statespace/main/docs/assets/images/header_light.png" />
    <img src="https://raw.githubusercontent.com/statespace-tech/statespace/main/docs/assets/images/header_dark.png" alt="Statespace" width="375" />
  </picture>
</div>

<div align="center">

<br>

*The simplest way to document and connect AI to your data*

[![Test Suite](https://github.com/statespace-tech/statespace/actions/workflows/test.yml/badge.svg)](https://github.com/statespace-tech/statespace/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-007ec6?style=flat-square)](https://github.com/statespace-tech/statespace/blob/main/LICENSE)
[![crates.io](https://img.shields.io/crates/v/statespace?style=flat-square)](https://crates.io/crates/statespace)
[![Discord](https://img.shields.io/discord/1323415085011701870?label=Discord&logo=discord&logoColor=white&color=5865F2&style=flat-square)](https://discord.gg/rRyM7zkZTf)
[![X](https://img.shields.io/badge/Statespace-black?style=flat-square&logo=x&logoColor=white)](https://x.com/statespace_tech)

</div>

---

**Website: [https://statespace.com](https://statespace.com/)**

**Documentation: [https://docs.statespace.com](https://docs.statespace.com/)**

---

AI doesn't know your data. Statespace helps you quickly wire up the APIs and MCPs your agents need to understand and work with it. Build RAG, text-to-SQL, knowledge bases, and more, in just a few lines of code. Once you’ve created an app, you can deploy, manage, and share it from our [cloud platform](https://statespace.com/).

## Example

### 1. Create it

Create a file `README.md` with:

```yaml
---
tools:
  - [psql, -d, $DB, -c, { regex: "^SELECT\\b.*" }]
---

# Instructions
- Learn the schema by exploring tables, columns, and relationships
- Translate the user's question into a query that answers it
```

### 2. Run it

Configure the MCP server on your client:

```json
"statespace": {
  "command": "uvx",
  "args": [
    "statespace-mcp",
    "path/to/app/"
  ],
  "env": {
    "DB": "postgresql://user:pass@host:port/db"
  }
}
```

Alternatively, install the Statespace CLI and agent skill:

```bash
npm install -g statespace 

# run the app locally
statespace serve path/to/app/ --env DB=postgresql://user:pass@host:port/db --port 8080
```


### 3. Ask it

Ask your MCP-enabled agent directly:

```bash
claude "How many users do we have?"
```

Or activate the skill and then ask your agent:

```
claude "/statespace Use the API at http://127.0.01:8080 to find out how many users we have"
```


### 4. Update it

Add as much context and tools as your application needs

```text
path/to/app/
├── README.md           # from above
├── script.py
└── schema/
    ├── users.md
    └── products.md
```

Then update `README.md` with new tools and instructions:

```yaml
---
tools:
  - [grep, -r]
  - [python3, script.py]
  - [psql, -d, $DB, -c, { regex: "^SELECT\\b.*" }]
---


# Instructions
- Learn the schema by exploring tables, columns, and relationships
- Translate the user's question into a query that answers it
- Search through the database's [[./schema]] files with `grep`
- Run script.py to check the number of active connections
```

### 5. Deploy it

Optionally, create a [Statespace account](https://statespace.com/auth/login) to deploy your app and get a shareable URL

Then, simply replace your app's path with this URL: `path/to/app` → `https://demo.statespace.app`

### More examples

- **[vectorless rag](examples/vectorless_rag)**
- **[postgresql](examples/postgresql)**
- **[mysql](examples/mysql)**
- **[sqlite](examples/sqlite)**
- **[snowflake](examples/snowflake)**
- **[mssql](examples/mssql)**
- **[mongodb](examples/mongodb)**
- **[duckdb](examples/duckdb)**

## Community & Contributing

- **Discord**: Join our [community server](https://discord.gg/rRyM7zkZTf) for real-time help and discussions
- **X**: Follow us [@statespace_tech](https://x.com/statespace_tech) for updates and news
- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/statespace-tech/statespace/issues)

## License

This project is licensed under the terms of the MIT license.
