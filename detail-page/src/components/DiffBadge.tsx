import { Tag } from "antd";
import { formatDiffPercent, formatDiffMs } from "../utils/formatting";

interface DiffBadgeProps {
  diffPercent?: number;
  diffMs?: number;
}

export function DiffBadge({ diffPercent, diffMs }: DiffBadgeProps) {
  if (diffPercent == null) return <Tag>-</Tag>;

  const absDiff = Math.abs(diffPercent);
  const label =
    diffMs != null && diffMs !== 0
      ? `${formatDiffPercent(diffPercent)} (${formatDiffMs(diffMs)})`
      : formatDiffPercent(diffPercent);

  if (absDiff < 2) {
    return <Tag>{label}</Tag>;
  }

  if (diffPercent < 0) {
    return <Tag color="success">{label}</Tag>;
  }

  return <Tag color="error">{label}</Tag>;
}
