export function formatMs(value: number): string {
  if (value === 0) return "0 ms";
  if (value > 100000) return `${Math.round(value / 1000)} s`;
  if (value > 10000) return `${Math.round(value / 100) / 10} s`;
  if (value > 1000) return `${Math.round(value / 10) / 100} s`;
  if (value > 10) return `${Math.round(value)} ms`;
  if (value > 1) return `${Math.round(value * 10) / 10} ms`;
  if (value > 0.1) return `${Math.round(value * 100) / 100} ms`;
  if (value > 0.01) return `${Math.round(value * 1000)} us`;
  return `${Math.round(value * 10000) / 10} us`;
}

export function formatBytes(value: number): string {
  if (value === 0) return "-";
  if (value > 1024 * 102400) return `${Math.round(value / 1024 / 1024)} MiB`;
  if (value > 1024 * 10240)
    return `${Math.round(value / 1024 / 102.4) / 10} MiB`;
  if (value > 1024 * 1024)
    return `${Math.round(value / 1024 / 10.24) / 100} MiB`;
  if (value > 102400) return `${Math.round(value / 1024)} KiB`;
  if (value > 10240) return `${Math.round(value / 102.4) / 10} KiB`;
  if (value > 1024) return `${Math.round(value / 10.24) / 100} KiB`;
  return `${Math.round(value)} bytes`;
}

export function formatDiffPercent(percent: number): string {
  if (percent > 0) return `+${percent.toFixed(1)}%`;
  return `${percent.toFixed(1)}%`;
}

/** Format signed duration delta for display (e.g. "+120 ms", "-80 ms"). */
export function formatDiffMs(diffMs: number): string {
  const sign = diffMs >= 0 ? "+" : "";
  return `${sign}${formatMs(Math.abs(diffMs))}`;
}
