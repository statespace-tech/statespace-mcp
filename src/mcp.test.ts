import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";

let server: http.Server;
let baseUrl: string;

// Track auth headers received by the fake server
const receivedAuth: (string | undefined)[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    receivedAuth.push(req.headers["authorization"]);
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET") {
      if (url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("# App instructions");
        return;
      }
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

afterAll(() => server.close());

async function getPage(pagePath: string, token?: string): Promise<string> {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  const res = await fetch(new URL(pagePath, base).toString(), { headers });
  if (!res.ok) {
    const body = await res.json() as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.text();
}

async function callTool(pagePath: string, command: string[], token?: string): Promise<{ stdout: string; stderr: string; returncode: number }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  const res = await fetch(new URL(pagePath, base).toString(), {
    method: "POST",
    headers,
    body: JSON.stringify({ command }),
  });
  const body = await res.json() as { data?: { stdout: string; stderr: string; returncode: number }; error?: string };
  if (!res.ok || body.error) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body.data!;
}

describe("instructions", () => {
  it("fetches instructions from the root URL", async () => {
    const res = await fetch(baseUrl);
    const text = await res.text();
    expect(text).toBe("# App instructions");
  });
});

describe("read_page", () => {
  it("returns page content", async () => {
    const content = await getPage("README.md");
    expect(content).toBe("# Hello from test app");
  });

  it("throws on missing page", async () => {
    await expect(getPage("missing.md")).rejects.toThrow("not found");
  });

  it("sends Authorization header when token provided", async () => {
    receivedAuth.length = 0;
    await getPage("README.md", "test-token");
    expect(receivedAuth[0]).toBe("Bearer test-token");
  });

  it("sends no Authorization header without token", async () => {
    receivedAuth.length = 0;
    await getPage("README.md");
    expect(receivedAuth[0]).toBeUndefined();
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

  it("sends Authorization header when token provided", async () => {
    receivedAuth.length = 0;
    await callTool("README.md", ["ls"], "test-token");
    expect(receivedAuth[0]).toBe("Bearer test-token");
  });
});
