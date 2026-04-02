#!/usr/bin/env node
import path from "path";
import { fileURLToPath } from "url";
import { startServer } from "./serve.js";
import { startMcpServer } from "./mcp.js";
import { resolvePath } from "./runtime/content.js";
import { processComponentBlocks } from "./runtime/components.js";
import { mergeEvalEnv } from "./runtime/env.js";
import { parseFrontmatter } from "./runtime/frontmatter.js";
import { isValidToolCall, expandCommandForExecution } from "./runtime/validation.js";
import { executeCommand } from "./runtime/executor.js";
import fs from "fs/promises";

const args = process.argv.slice(2);

function usage(): never {
  process.stderr.write(
    [
      "Usage:",
      "  statespace serve <path> [--host <host>] [--port <port>]",
      "  statespace mcp <url>",
      "  statespace read [--root <dir>] <page>",
      "  statespace run [--root <dir>] <page> <command...>",
      "",
    ].join("\n")
  );
  process.exit(1);
}

const command = args[0];

// Collect env from process for server use (all non-reserved vars)
function collectProcessEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }
  return env;
}

if (command === "serve") {
  const rootArg = args[1];
  if (!rootArg) usage();

  const rootDir = path.resolve(rootArg);
  let host = "127.0.0.1";
  let port = 8000;

  for (let i = 2; i < args.length; i++) {
    if (args[i] === "--host" && args[i + 1]) {
      host = args[++i]!;
    } else if (args[i] === "--port" && args[i + 1]) {
      port = parseInt(args[++i]!, 10);
      if (isNaN(port)) {
        process.stderr.write("Invalid port number\n");
        process.exit(1);
      }
    }
  }

  startServer(rootDir, { host, port, env: collectProcessEnv() });
} else if (command === "mcp") {
  const targetArg = args[1];
  if (!targetArg) usage();

  if (!targetArg.startsWith("http://") && !targetArg.startsWith("https://")) {
    process.stderr.write("Error: mcp requires an http or https URL\n");
    process.exit(1);
  }

  startMcpServer(targetArg).catch((err: unknown) => {
    process.stderr.write(`Error: ${String(err)}\n`);
    process.exit(1);
  });
} else if (command === "read") {
  // Parse optional --root flag (local dir or http/https base URL)
  let root = process.cwd();
  let i = 1;
  if (args[i] === "--root" && args[i + 1]) {
    root = args[++i]!;
    i++;
  }
  const pagePath = args[i];
  if (!pagePath) usage();

  const isRemote = root.startsWith("http://") || root.startsWith("https://");
  if (isRemote) {
    const baseUrl = root.endsWith("/") ? root : root + "/";
    const url = new URL(pagePath, baseUrl).toString();
    const response = await fetch(url);
    if (!response.ok) {
      let msg = `HTTP ${response.status}`;
      try { const b = await response.json() as { error?: string }; if (b.error) msg = b.error; } catch { /* ignore */ }
      process.stderr.write(`Error: ${msg}\n`);
      process.exit(1);
    }
    process.stdout.write(await response.text());
  } else {
    const rootDir = path.resolve(root);
    const env = collectProcessEnv();
    const filePath = await resolvePath(rootDir, pagePath).catch((e: { message?: string }) => {
      process.stderr.write(`Error: ${e.message ?? String(e)}\n`);
      process.exit(1);
    });
    const content = await fs.readFile(filePath, "utf8");
    const rendered = await processComponentBlocks(content, path.dirname(filePath), env);
    process.stdout.write(rendered);
  }
} else if (command === "run") {
  // Parse optional --root flag (local dir or http/https base URL)
  let root = process.cwd();
  let i = 1;
  if (args[i] === "--root" && args[i + 1]) {
    root = args[++i]!;
    i++;
  }
  const pagePath = args[i];
  const runCommand = args.slice(i + 1);
  if (!pagePath || runCommand.length === 0) usage();

  const isRemote = root.startsWith("http://") || root.startsWith("https://");
  if (isRemote) {
    const baseUrl = root.endsWith("/") ? root : root + "/";
    const url = new URL(pagePath, baseUrl).toString();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: runCommand }),
    });
    const body = await response.json() as { data?: { stdout: string; stderr: string; returncode: number }; error?: string };
    if (!response.ok || body.error) {
      process.stderr.write(`Error: ${body.error ?? `HTTP ${response.status}`}\n`);
      process.exit(1);
    }
    const result = body.data!;
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.returncode);
  } else {
    const rootDir = path.resolve(root);
    const env = collectProcessEnv();
    const filePath = await resolvePath(rootDir, pagePath).catch((e: { message?: string }) => {
      process.stderr.write(`Error: ${e.message ?? String(e)}\n`);
      process.exit(1);
    });
    const content = await fs.readFile(filePath, "utf8");
    const frontmatter = parseFrontmatter(content);

    if (!isValidToolCall(runCommand, frontmatter.specs)) {
      process.stderr.write(`Error: command not allowed: ${runCommand.join(" ")}\n`);
      process.exit(1);
    }

    const mergedEnv = mergeEvalEnv(env, {});
    const expandedCommand = expandCommandForExecution(runCommand, frontmatter.specs, mergedEnv);
    const result = await executeCommand(expandedCommand, path.dirname(filePath), mergedEnv).catch(
      (e: { message?: string }) => {
        process.stderr.write(`Error: ${e.message ?? String(e)}\n`);
        process.exit(1);
      }
    );
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.returncode);
  }
} else if (command === "init") {
  const skillSrc = path.join(path.dirname(fileURLToPath(import.meta.url)), "skills", "statespace.md");
  const claudeDir = path.join(process.env["HOME"] ?? "", ".claude", "commands");
  const skillDest = path.join(claudeDir, "statespace.md");

  await fs.mkdir(claudeDir, { recursive: true });
  await fs.copyFile(skillSrc, skillDest);
  process.stderr.write(`Skill installed to ${skillDest}\n`);
  process.stderr.write(`Use /statespace <path> in Claude Code to get started.\n`);
} else {
  usage();
}
