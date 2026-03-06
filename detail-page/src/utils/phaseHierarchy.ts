import type { CaseData, PhaseRow, StatEntry } from "./types";

// Non-phase metric keys to exclude from the phase view
const EXCLUDED_KEYS = new Set([
  "stats",
  "exec",
  "heap memory",
  "rss memory",
  "external memory",
  "array buffers memory",
  "dist size",
]);

// Top-level phase grouping
const PHASE_GROUPS: Record<string, { label: string; match: (key: string) => boolean }> = {
  make: {
    label: "make",
    match: (key) => key.startsWith("Compiler.make") || key.startsWith("Compiler.finish make"),
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
      key.startsWith("buildChunkGraph."),
  },
  emit: {
    label: "emit",
    match: (key) => key.startsWith("Compiler.emitAssets") || key.startsWith("Compiler.emit"),
  },
};

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

  if (baseMean != null && currentMean != null && baseMean > 0) {
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

  // Filter to only phase metrics
  const phaseKeys = [...allKeys].filter((k) => !EXCLUDED_KEYS.has(k));

  // Group keys into top-level phases
  const grouped: Record<string, string[]> = { make: [], seal: [], emit: [] };
  const ungrouped: string[] = [];

  for (const key of phaseKeys) {
    let matched = false;
    for (const [group, { match }] of Object.entries(PHASE_GROUPS)) {
      if (match(key)) {
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

  // Build tree for each group
  for (const [group, keys] of Object.entries(grouped)) {
    if (keys.length === 0) continue;

    const children: PhaseRow[] = keys
      .map((key) => buildPhaseRow(key, key, caseData.base[key], caseData.current[key]))
      .filter((row) => (row.baseMean ?? 0) > 0 || (row.currentMean ?? 0) > 0)
      .sort((a, b) => (b.baseMean ?? 0) - (a.baseMean ?? 0));

    // Compute group totals from the top-level summary keys
    const summaryKey = group === "make" ? "Compiler.make"
      : group === "seal" ? "Compiler.seal compilation"
      : "Compiler.emitAssets";

    const groupRow = buildPhaseRow(
      group,
      PHASE_GROUPS[group].label,
      caseData.base[summaryKey],
      caseData.current[summaryKey]
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
