interface Result {
  url: string;
  site: string;
  title: string;
  score: number;
}

export async function runSearch(argv: string[]): Promise<void> {
  const positional: string[] = [];
  let limit = 10;
  let site: string | undefined;
  let baseUrl = "http://localhost:3000";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "Usage: statespace search <query> [options]\n\n" +
        "Options:\n" +
        "  --limit, -l <n>     Max results (default: 10)\n" +
        "  --site,  -s <site>  Restrict to a specific site\n" +
        "  --url,   -u <url>   API base URL (default: http://localhost:3000)\n" +
        "  --help,  -h         Show this help\n"
      );
      process.exit(0);
    } else if (arg === "--limit" || arg === "-l") {
      limit = parseInt(argv[++i] ?? "10", 10);
    } else if (arg === "--site" || arg === "-s") {
      site = argv[++i];
    } else if (arg === "--url" || arg === "-u") {
      baseUrl = argv[++i] ?? "http://localhost:3000";
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  const query = positional.join(" ").trim();
  if (!query) {
    process.stderr.write("Error: query is required\nUsage: statespace search <query>\n");
    process.exit(1);
  }

  const url = new URL(`${baseUrl}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  if (site) url.searchParams.set("site", site);

  let results: Result[];
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    results = (await res.json()) as Result[];
  } catch (e) {
    process.stderr.write(`Error: ${(e as Error).message}\n`);
    process.exit(1);
  }

  if (results.length === 0) {
    process.stdout.write("no results\n");
    return;
  }

  for (const r of results) {
    const source = r.site || r.title || r.url;
    process.stdout.write(`${source} — ${r.url}\n`);
  }
}
