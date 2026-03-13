import { Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { CaseData, PhaseRow } from "../utils/types";
import { buildPhaseTree } from "../utils/phaseHierarchy";
import { formatMs } from "../utils/formatting";
import { DiffBadge } from "./DiffBadge";

const PHASE_NAME_MAX_WIDTH = 300;

function sortByAbsDiff(rows: PhaseRow[]): PhaseRow[] {
  return [...rows]
    .map((r) =>
      r.children ? { ...r, children: sortByAbsDiff(r.children) } : r
    )
    .sort((a, b) => Math.abs(b.diffPercent ?? 0) - Math.abs(a.diffPercent ?? 0));
}

interface PhaseTableProps {
  caseData: CaseData;
}

export function PhaseTable({ caseData }: PhaseTableProps) {
  const phaseTree = useMemo(() => {
    const tree = buildPhaseTree(caseData);
    return sortByAbsDiff(tree);
  }, [caseData]);

  const columns: ColumnsType<PhaseRow> = [
    {
      title: "Phase",
      dataIndex: "phase",
      key: "phase",
      width: 320,
      render: (text: string) => (
        <Tooltip title={text}>
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "inline-block",
              maxWidth: PHASE_NAME_MAX_WIDTH,
            }}
          >
            {text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Base (ms)",
      key: "base",
      width: 140,
      align: "right" as const,
      render: (_: unknown, record: PhaseRow) => {
        if (record.baseMean == null) return "-";
        const conf = record.baseConfidence != null ? ` \u00B1 ${formatMs(record.baseConfidence)}` : "";
        return `${formatMs(record.baseMean)}${conf}`;
      },
    },
    {
      title: "Current (ms)",
      key: "current",
      width: 140,
      align: "right" as const,
      render: (_: unknown, record: PhaseRow) => {
        if (record.currentMean == null) return "-";
        const conf = record.currentConfidence != null ? ` \u00B1 ${formatMs(record.currentConfidence)}` : "";
        const text = `${formatMs(record.currentMean)}${conf}`;
        const d = record.diffPercent;
        const color =
          d != null && Math.abs(d) >= 2
            ? d < 0
              ? "#52c41a"
              : "#ff4d4f"
            : undefined;
        return color ? <span style={{ color }}>{text}</span> : text;
      },
    },
    {
      title: "Diff (%)",
      key: "diff",
      width: 100,
      align: "center" as const,
      defaultSortOrder: "descend",
      render: (_: unknown, record: PhaseRow) => (
        <DiffBadge diffPercent={record.diffPercent} diffMs={record.diffMs} />
      ),
    },
  ];

  const SIGNIFICANT_DIFF_THRESHOLD = 2;
  const getRowStyle = (record: PhaseRow): CSSProperties => {
    const d = record.diffPercent;
    if (d == null || Math.abs(d) < SIGNIFICANT_DIFF_THRESHOLD) return {};
    return {
      backgroundColor: d < 0 ? "rgba(82, 196, 26, 0.06)" : "rgba(255, 77, 79, 0.06)",
    };
  };

  return (
    <Table<PhaseRow>
      columns={columns}
      dataSource={phaseTree}
      expandable={{
        defaultExpandAllRows: true,
        childrenColumnName: "children",
      }}
      onRow={(record) => ({ style: getRowStyle(record) })}
      pagination={false}
      size="middle"
      rowKey="key"
    />
  );
}
