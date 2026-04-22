import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export async function startMcpServer(baseUrl: string): Promise<void> {
  const server = new Server(
    { name: "doc-search-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "search",
        description: "Search documentation indexed from llms.txt sites. Without a site filter, returns the most relevant sites for the query. With a site filter, returns pages within that site.",
        inputSchema: {
          type: "object" as const,
          properties: {
            q: {
              type: "string",
              description: "Search query",
            },
            limit: {
              type: "integer",
              description: "Max results to return (default: 10)",
              default: 10,
            },
            site: {
              type: "string",
              description: "Restrict results to a specific site (accepts site name, domain, or full URL)",
            },
          },
          required: ["q"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "search") {
      const q = args?.["q"] as string | undefined;
      if (!q) {
        return {
          content: [{ type: "text" as const, text: "Error: q is required" }],
          isError: true,
        };
      }

      const limit = (args?.["limit"] as number | undefined) ?? 10;
      const site = args?.["site"] as string | undefined;

      const url = new URL(`${baseUrl}/search`);
      url.searchParams.set("q", q);
      url.searchParams.set("limit", String(limit));
      if (site) url.searchParams.set("site", site);

      try {
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const results = await response.json();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
        };
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
