import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";

// Spin up a minimal fake Statespace server for the tests
let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET") {
      if (url.pathname === "/README.md") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("# Hello from test app");
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        const { command } = JSON.parse(body) as { command: string[] };
        if (url.pathname === "/README.md" && command[0] === "ls") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ data: { stdout: "file.txt\n", stderr: "", returncode: 0 } }));
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "command not allowed" }));
        }
      });
      return;
    }

    res.writeHead(405);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
  server.close();
});

// Direct HTTP fetch helpers (mirrors what mcp.ts does internally)
async function getPage(pagePath: string): Promise<string> {
  const res = await fetch(`${baseUrl}/${pagePath}`);
  if (!res.ok) {
    const body = await res.json() as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.text();
}

async function callTool(pagePath: string, command: string[]): Promise<{ stdout: string; stderr: string; returncode: number }> {
  const res = await fetch(`${baseUrl}/${pagePath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  const body = await res.json() as { data?: { stdout: string; stderr: string; returncode: number }; error?: string };
  if (!res.ok || body.error) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body.data!;
}

describe("read_page", () => {
  it("returns page content on success", async () => {
    const content = await getPage("README.md");
    expect(content).toBe("# Hello from test app");
  });

  it("throws on missing page", async () => {
    await expect(getPage("missing.md")).rejects.toThrow("not found");
  });
});

describe("run_command", () => {
  it("returns stdout on a valid command", async () => {
    const result = await callTool("README.md", ["ls"]);
    expect(result.stdout).toBe("file.txt\n");
    expect(result.returncode).toBe(0);
  });

  it("throws when the server rejects the command", async () => {
    await expect(callTool("README.md", ["rm", "-rf", "/"])).rejects.toThrow("command not allowed");
  });
});
