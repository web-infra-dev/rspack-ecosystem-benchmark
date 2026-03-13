import type { CaseData, PhaseRow, StatEntry } from "./types";

// Non-phase metric keys to exclude from the phase view
const EXCLUDED_KEYS = new Set([
  "stats",
  "exec",
  "execRebuild",
  "heap memory",
  "rss memory",
  "external memory",
  "array buffers memory",
  "dist size",
]);

// Top-level phase grouping for stats.toJson logging data
const PHASE_GROUPS: Record<string, { label: string; match: (key: string) => boolean }> = {
  make: {
    label: "make",
    match: (key) =>
      key.startsWith("Compiler.make") ||
      key.startsWith("Compiler.finish make") ||
      key === "trace.make",
  },
  seal: {
    label: "seal",
    match: (key) =>
      key.startsWith("Compilation.") ||
      key.startsWith("Compiler.seal") ||
      key.startsWith("Compiler.finish compilation") ||
      key.startsWith("SplitChunksPlugin.") ||
      key.startsWith("ModuleConcatenationPlugin.") ||
      key.startsWith("RealContentHashPlugin.") ||
      key.startsWith("SourceMapDevToolPlugin.") ||
      key.startsWith("RemoveEmptyChunksPlugin.") ||
      key.startsWith("EnsureChunkConditionsPlugin.") ||
      key.startsWith("WarnCaseSensitiveModulesPlugin.") ||
      key.startsWith("buildChunkGraph.") ||
      key === "trace.seal",
  },
  emit: {
    label: "emit",
    match: (key) =>
      key.startsWith("Compiler.emitAssets") ||
      key.startsWith("Compiler.emit") ||
      key === "trace.emit",
  },
  tracing: {
    label: "tracing (RSPACK_PROFILE)",
    match: (key) => key.startsWith("trace."),
  },
};

// Skip diff for phases with very small data (< 1ms) to avoid noisy percentages
const MIN_MEAN_MS_FOR_DIFF = 1;

function buildPhaseRow(
  key: string,
  label: string,
  baseStat?: StatEntry,
  currentStat?: StatEntry
): PhaseRow {
  const baseMean = baseStat?.mean;
  const currentMean = currentStat?.mean;
  let diffPercent: number | undefined;
  let diffMs: number | undefined;

  if (
    baseMean != null &&
    currentMean != null &&
    baseMean > 0 &&
    baseMean >= MIN_MEAN_MS_FOR_DIFF
  ) {
    diffPercent = ((currentMean - baseMean) / baseMean) * 100;
    diffMs = currentMean - baseMean;
  }

  return {
    key,
    phase: label,
    baseMean,
    baseConfidence: baseStat?.confidence,
    currentMean,
    currentConfidence: currentStat?.confidence,
    diffPercent,
    diffMs,
  };
}

export function buildPhaseTree(caseData: CaseData): PhaseRow[] {
  const allKeys = new Set([
    ...Object.keys(caseData.base),
    ...Object.keys(caseData.current),
  ]);

  // Filter to only phase/time metrics (exclude memory, size, cache metrics)
  const phaseKeys = [...allKeys].filter(
    (k) => !EXCLUDED_KEYS.has(k) && !k.endsWith(" memory") && !k.endsWith(" size") && !k.endsWith(" cache")
  );

  // Group keys into top-level phases: seal, emit, make, tracing (RSPACK_PROFILE) last
  const groupOrder = ["make", "seal", "emit", "tracing"];
  const grouped: Record<string, string[]> = {};
  for (const g of groupOrder) grouped[g] = [];
  const ungrouped: string[] = [];

  for (const key of phaseKeys) {
    let matched = false;
    for (const group of groupOrder) {
      if (PHASE_GROUPS[group].match(key)) {
        grouped[group].push(key);
        matched = true;
        break;
      }
    }
    if (!matched) {
      ungrouped.push(key);
    }
  }

  const result: PhaseRow[] = [];

  // Summary keys for each group
  const summaryKeys: Record<string, string[]> = {
    make: ["Compiler.make", "trace.make"],
    seal: ["Compiler.seal compilation", "trace.seal"],
    emit: ["Compiler.emitAssets", "trace.emit"],
    tracing: [],
  };

  // Build tree for each group
  for (const group of groupOrder) {
    const keys = grouped[group];
    if (keys.length === 0) continue;

    const children: PhaseRow[] = keys
      .map((key) => buildPhaseRow(key, key, caseData.base[key], caseData.current[key]))
      .filter((row) => (row.baseMean ?? 0) > 0 || (row.currentMean ?? 0) > 0)
      .sort((a, b) => (b.baseMean ?? 0) - (a.baseMean ?? 0));

    if (children.length === 0) continue;

    // Find the best summary key for group totals
    const candidates = summaryKeys[group] || [];
    let baseSummary: StatEntry | undefined;
    let currentSummary: StatEntry | undefined;
    for (const sk of candidates) {
      if (!baseSummary && caseData.base[sk]) baseSummary = caseData.base[sk];
      if (!currentSummary && caseData.current[sk]) currentSummary = caseData.current[sk];
    }

    const groupRow = buildPhaseRow(
      group,
      PHASE_GROUPS[group].label,
      baseSummary,
      currentSummary
    );

    groupRow.children = children;
    result.push(groupRow);
  }

  // Add ungrouped metrics
  for (const key of ungrouped) {
    const row = buildPhaseRow(key, key, caseData.base[key], caseData.current[key]);
    if ((row.baseMean ?? 0) > 0 || (row.currentMean ?? 0) > 0) {
      result.push(row);
    }
  }

  return result;
}

export function getOverallStats(caseData: CaseData) {
  return {
    base: caseData.base["stats"] || caseData.base["exec"],
    current: caseData.current["stats"] || caseData.current["exec"],
  };
}
