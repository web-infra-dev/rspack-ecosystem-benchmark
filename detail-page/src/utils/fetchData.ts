import type { BenchmarkData, CaseData, StatEntry } from "./types";

const FETCH_PREFIX =
  "https://raw.githubusercontent.com/web-infra-dev/rspack-ecosystem-benchmark/data";

const BENCHMARK_API_URL = "https://rspack-benchmark-api.rspack.workers.dev";

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
 * Fetch current benchmark data from Cloudflare by id.
 */
async function fetchCurrentDataById(
  id: string
): Promise<Record<string, Record<string, StatEntry>>> {
  const res = await fetch(`${BENCHMARK_API_URL.replace(/\/$/, "")}/benchmark/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch benchmark ${id}: ${res.status}`);
  const json = await res.json();
  if (json.data == null) throw new Error("Invalid benchmark response: missing data");
  return json.data;
}

export function getUrlParams(): { base: string; id: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    base: params.get("base") || "latest",
    id: params.get("id"),
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
 * - `base`: date or "latest" (from data branch).
 * - `id`: if set, current data is fetched from Cloudflare GET /benchmark/:id.
 */
export async function fetchBenchmarkData(
  base: string,
  id: string | null,
): Promise<BenchmarkData> {
  const [index, buildInfo] = await Promise.all([fetchIndex(), fetchBuildInfo()]);

  if (base === "latest") {
    base = index[index.length - 1]?.date ?? "";
  }

  const baseResults = await fetchResultsByDate(base, index);

  let currentResults: { name: string; result: Record<string, StatEntry> }[];
  let currentLabel: string;

  if (id) {
    const currentData = await fetchCurrentDataById(id);
    currentResults = Object.entries(currentData).map(([name, result]) => ({
      name,
      result,
    }));
    currentLabel = "PR";
  } else {
    const params = new URLSearchParams(window.location.search);
    const current = params.get("current") || "";
    if (!current) {
      throw new Error(
        "Missing current data: provide ?id=<benchmark-id> or ?current=<date>"
      );
    }
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
