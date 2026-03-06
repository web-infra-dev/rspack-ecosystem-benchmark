import type { BenchmarkData, CaseData, StatEntry } from "./types";

const FETCH_PREFIX =
  "https://raw.githubusercontent.com/web-infra-dev/rspack-ecosystem-benchmark/data";

interface IndexEntry {
  date: string;
  files: string[];
}

async function fetchIndex(): Promise<IndexEntry[]> {
  const res = await fetch(`${FETCH_PREFIX}/index.txt`);
  if (!res.ok) throw new Error(`Failed to fetch index.txt: ${res.status}`);
  const text = await res.text();
  const lines = text.split("\n").filter(Boolean);

  const result: IndexEntry[] = [];
  const mappings: Record<string, string[]> = {};
  for (const line of lines) {
    const [date, fileName] = line.split("/");
    if (!mappings[date]) {
      mappings[date] = [];
      result.push({ date, files: mappings[date] });
    }
    mappings[date].push(fileName);
  }
  return result;
}

async function fetchBuildInfo(): Promise<Record<string, { commitSHA: string }>> {
  const res = await fetch(`${FETCH_PREFIX}/build-info.json`);
  if (!res.ok) return {};
  return res.json();
}

async function fetchBenchmarkResult(date: string, file: string): Promise<Record<string, StatEntry>> {
  const res = await fetch(`${FETCH_PREFIX}/${date}/${file}`);
  if (!res.ok) throw new Error(`Failed to fetch ${date}/${file}: ${res.status}`);
  return res.json();
}

/**
 * Decompress a base64url-encoded gzip string using the browser's DecompressionStream API.
 */
async function decompressFromHash(encoded: string): Promise<Record<string, Record<string, StatEntry>>> {
  // base64url → standard base64
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binaryStr = atob(b64);
  const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));

  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const json = new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
  return JSON.parse(json);
}

export function getUrlParams(): { base: string; hash: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    base: params.get("base") || "latest",
    hash: window.location.hash.slice(1), // remove leading '#'
  };
}

async function fetchResultsByDate(
  date: string,
  index: IndexEntry[]
): Promise<{ name: string; result: Record<string, StatEntry> }[]> {
  const entry = index.find((e) => e.date === date);
  if (!entry) throw new Error(`Date "${date}" not found in index`);
  return Promise.all(
    entry.files
      .filter((f) => f.endsWith(".json"))
      .map(async (file) => ({
        name: file.replace(/\.json$/, ""),
        result: await fetchBenchmarkResult(date, file),
      }))
  );
}

/**
 * Fetch benchmark data.
 * - `base`: date string or "latest", fetched from data branch
 * - `hash`: if provided, current data is decoded from the gzip+base64url hash (PR benchmarks);
 *           otherwise unused (for daily comparisons, use ?base=dateA&current=dateB via search params)
 */
export async function fetchBenchmarkData(
  base: string,
  hash: string
): Promise<BenchmarkData> {
  const [index, buildInfo] = await Promise.all([fetchIndex(), fetchBuildInfo()]);

  // Resolve "latest" to the last date in the index
  if (base === "latest") {
    base = index[index.length - 1]?.date ?? "";
  }

  // Fetch base data from data branch
  const baseResults = await fetchResultsByDate(base, index);

  // Get current data: either from hash or from data branch
  let currentResults: { name: string; result: Record<string, StatEntry> }[];
  let currentLabel: string;

  if (hash) {
    // PR benchmark: current data is compressed in the URL hash
    const currentData = await decompressFromHash(hash);
    currentResults = Object.entries(currentData).map(([name, result]) => ({
      name,
      result,
    }));
    currentLabel = "PR";
  } else {
    // Daily comparison: current date from search params
    const params = new URLSearchParams(window.location.search);
    const current = params.get("current") || "";
    if (!current) throw new Error("Missing current data: provide ?current=<date> or URL hash with compressed data");
    let resolvedCurrent = current;
    if (resolvedCurrent === "latest") {
      resolvedCurrent = index[index.length - 1]?.date ?? "";
    }
    currentResults = await fetchResultsByDate(resolvedCurrent, index);
    currentLabel = resolvedCurrent;
  }

  const cases: Record<string, CaseData> = {};
  const allNames = new Set([
    ...baseResults.map((r) => r.name),
    ...currentResults.map((r) => r.name),
  ]);

  for (const name of allNames) {
    const baseResult = baseResults.find((r) => r.name === name)?.result ?? {};
    const currentResult = currentResults.find((r) => r.name === name)?.result ?? {};
    cases[name] = { base: baseResult, current: currentResult };
  }

  return {
    meta: {
      baseDate: base,
      currentDate: currentLabel,
      baseCommitSHA: buildInfo[base]?.commitSHA,
    },
    cases,
  };
}
