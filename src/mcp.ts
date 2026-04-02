// MCP server — two tools: read_page and run_command
// Purely an HTTP proxy: all tool calls go through the Statespace HTTP API.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export function loadAgentsMcp(): string {
  return readFileSync(path.join(__dirname, "prompts", "mcp", "AGENTS.md"), "utf8").trim();
}

// ---------------------------------------------------------------------------
// HTTP calls to the Statespace serve API
// ---------------------------------------------------------------------------

async function getPage(baseUrl: string, pagePath: string): Promise<string> {
  const url = new URL(pagePath, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
  const response = await fetch(url.toString());
  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) errorMsg = body.error;
    } catch { /* ignore */ }
    throw new Error(errorMsg);
  }
  return response.text();
}

async function callTool(
  baseUrl: string,
  pagePath: string,
  command: string[],
  requestEnv: Record<string, string>
): Promise<{ stdout: string; stderr: string; returncode: number }> {
  const url = new URL(pagePath, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, env: requestEnv }),
  });

  const body = (await response.json()) as {
    data?: { stdout: string; stderr: string; returncode: number };
    error?: string;
  };

  if (!response.ok || body.error) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }

  return body.data!;
}

// ---------------------------------------------------------------------------
// MCP server entry point
// ---------------------------------------------------------------------------

export async function startMcpServer(baseUrl: string): Promise<void> {
  const instructions = loadAgentsMcp();

  const server = new Server(
    { name: "statespace", version: "0.1.0" },
    { capabilities: { tools: {} }, instructions: instructions }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "read_page",
        description: "Read any file from the application. Returns raw content. Start with README.md.",
        inputSchema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description:
                "Path to the file, relative to the application root (e.g. \"README.md\", \"schema/users.md\", \"data/sales.csv\"). Defaults to README.md.",
              default: "README.md",
            },
          },
        },
      },
      {
        name: "run_command",
        description: "Execute a command declared in the YAML frontmatter of a Markdown page. Call read_page on the page first to read its command declarations.",
        inputSchema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Path to the Markdown page whose frontmatter declares this tool.",
            },
            command: {
              type: "array",
              items: { type: "string" },
              description:
                "The full command as an array of strings. Fixed elements must match exactly; fill in placeholders with your values.",
            },
            env: {
              type: "object",
              additionalProperties: { type: "string" },
              description: "Optional environment variables to pass to the command.",
            },
          },
          required: ["path", "command"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "read_page") {
      const pagePath = (args?.["path"] as string | undefined) ?? "README.md";
      try {
        const content = await getPage(baseUrl, pagePath);
        return { content: [{ type: "text" as const, text: content }] };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }

    if (name === "run_command") {
      const pagePath = args?.["path"] as string | undefined;
      const command = args?.["command"] as string[] | undefined;
      const requestEnv = (args?.["env"] as Record<string, string> | undefined) ?? {};

      if (!pagePath || !command || command.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Error: path and command are required" }],
          isError: true,
        };
      }

      try {
        const result = await callTool(baseUrl, pagePath, command, requestEnv);
        const text = [
          result.stdout,
          result.stderr ? `[stderr]: ${result.stderr}` : "",
          `[exit ${result.returncode}]`,
        ]
          .filter(Boolean)
          .join("\n");
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }

    return {
      content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
