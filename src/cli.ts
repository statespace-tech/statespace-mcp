#!/usr/bin/env node
import { startMcpServer } from "./mcp.js";

const args = process.argv.slice(2);
const url = args[0];

if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
  process.stderr.write("Usage: statespace-mcp <url>\n");
  process.stderr.write("  url  http or https URL of a deployed Statespace app\n");
  process.exit(1);
}

startMcpServer(url).catch((err: unknown) => {
  process.stderr.write(`Error: ${String(err)}\n`);
  process.exit(1);
});
