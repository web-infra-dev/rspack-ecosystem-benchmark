import { Tag } from "antd";
import { formatDiffPercent } from "../utils/formatting";

interface DiffBadgeProps {
  diffPercent?: number;
}

export function DiffBadge({ diffPercent }: DiffBadgeProps) {
  if (diffPercent == null) return <Tag>-</Tag>;

  const absDiff = Math.abs(diffPercent);

  if (absDiff < 2) {
    return <Tag>{formatDiffPercent(diffPercent)}</Tag>;
  }

  if (diffPercent < 0) {
    return <Tag color="success">{formatDiffPercent(diffPercent)}</Tag>;
  }

  return <Tag color="error">{formatDiffPercent(diffPercent)}</Tag>;
}
