export interface StatEntry {
  min: number;
  max: number;
  mean: number;
  median: number;
  variance: number;
  stdDev: number;
  confidence: number;
  low: number;
  high: number;
  count: number;
}

export interface CaseData {
  base: Record<string, StatEntry>;
  current: Record<string, StatEntry>;
}

export interface BenchmarkMeta {
  baseDate: string;
  currentDate: string;
  baseCommitSHA?: string;
}

export interface BenchmarkData {
  meta: BenchmarkMeta;
  cases: Record<string, CaseData>;
}

export interface PhaseRow {
  key: string;
  phase: string;
  baseMean?: number;
  baseConfidence?: number;
  currentMean?: number;
  currentConfidence?: number;
  diffPercent?: number;
  diffMs?: number;
  children?: PhaseRow[];
}
