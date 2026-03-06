import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import type { CaseData, PhaseRow } from "../utils/types";
import { buildPhaseTree } from "../utils/phaseHierarchy";
import { formatMs, formatDiffPercent } from "../utils/formatting";
import { DiffBadge } from "./DiffBadge";
import { TimelineBar } from "./TimelineBar";

interface PhaseTableProps {
  caseData: CaseData;
}

function getMaxValue(rows: PhaseRow[]): number {
  let max = 0;
  for (const row of rows) {
    if (row.baseMean != null && row.baseMean > max) max = row.baseMean;
    if (row.currentMean != null && row.currentMean > max) max = row.currentMean;
    if (row.children) {
      const childMax = getMaxValue(row.children);
      if (childMax > max) max = childMax;
    }
  }
  return max;
}

export function PhaseTable({ caseData }: PhaseTableProps) {
  const phaseTree = useMemo(() => buildPhaseTree(caseData), [caseData]);
  const maxValue = useMemo(() => getMaxValue(phaseTree), [phaseTree]);

  const columns: ColumnsType<PhaseRow> = [
    {
      title: "Phase",
      dataIndex: "phase",
      key: "phase",
      width: 320,
      render: (text: string) => (
        <span style={{ fontFamily: "monospace", fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: "Base",
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
      title: "Current",
      key: "current",
      width: 140,
      align: "right" as const,
      render: (_: unknown, record: PhaseRow) => {
        if (record.currentMean == null) return "-";
        const conf = record.currentConfidence != null ? ` \u00B1 ${formatMs(record.currentConfidence)}` : "";
        return `${formatMs(record.currentMean)}${conf}`;
      },
    },
    {
      title: "Diff",
      key: "diff",
      width: 100,
      align: "center" as const,
      sorter: (a: PhaseRow, b: PhaseRow) =>
        Math.abs(b.diffPercent ?? 0) - Math.abs(a.diffPercent ?? 0),
      render: (_: unknown, record: PhaseRow) => <DiffBadge diffPercent={record.diffPercent} />,
    },
    {
      title: "Timeline",
      key: "timeline",
      render: (_: unknown, record: PhaseRow) => (
        <TimelineBar
          baseMean={record.baseMean}
          currentMean={record.currentMean}
          maxValue={maxValue}
        />
      ),
    },
  ];

  return (
    <Table<PhaseRow>
      columns={columns}
      dataSource={phaseTree}
      expandable={{
        defaultExpandAllRows: true,
        childrenColumnName: "children",
      }}
      pagination={false}
      size="middle"
      rowKey="key"
    />
  );
}
