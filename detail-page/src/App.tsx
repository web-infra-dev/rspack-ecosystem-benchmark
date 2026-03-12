import { ConfigProvider, Layout, Select, Typography, Space, Card, Statistic, Row, Col, Spin, Alert, Button, Tag } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BenchmarkData } from "./utils/types";
import { PhaseTable } from "./components/PhaseTable";
import { formatMs } from "./utils/formatting";
import { getOverallStats } from "./utils/phaseHierarchy";
import { fetchBenchmarkData, getUrlParams } from "./utils/fetchData";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export function App() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { base, id, hash } = getUrlParams();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchBenchmarkData(base, id, hash)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [base, id, hash]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" tip="Loading benchmark data..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 48 }}>
        <Alert
          type="error"
          message="Failed to load benchmark data"
          description={error}
          showIcon
          action={
            <Button size="small" danger onClick={load}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return <AppContent data={data} />;
}

function AppContent({ data }: { data: BenchmarkData }) {
  const caseNames = useMemo(() => Object.keys(data.cases), [data]);
  const [selectedCase, setSelectedCase] = useState(caseNames[0] ?? "");

  const caseOverallDiffMap = useMemo(() => {
    const map: Record<string, number | undefined> = {};
    for (const name of caseNames) {
      const caseData = data.cases[name];
      const overall = caseData ? getOverallStats(caseData) : undefined;
      if (overall?.base && overall?.current && overall.base.mean > 0) {
        map[name] = ((overall.current.mean - overall.base.mean) / overall.base.mean) * 100;
      }
    }
    return map;
  }, [data, caseNames]);

  const caseData = data.cases[selectedCase];
  const overall = caseData ? getOverallStats(caseData) : undefined;

  const overallDiffPercent =
    overall?.base && overall?.current
      ? ((overall.current.mean - overall.base.mean) / overall.base.mean) * 100
      : undefined;

  const overallDiffColor =
    overallDiffPercent != null && Math.abs(overallDiffPercent) >= 2
      ? overallDiffPercent < 0
        ? "#3f8600"
        : "#cf1322"
      : undefined;
  const overallConclusion =
    overallDiffPercent != null
      ? Math.abs(overallDiffPercent) < 2
        ? "Overall: no significant change"
        : overallDiffPercent < 0
          ? `Overall: ${Math.abs(overallDiffPercent).toFixed(1)}% faster`
          : `Overall: ${overallDiffPercent.toFixed(1)}% slower`
      : null;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
      }}
    >
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e8e8e8",
            height: 64,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Rspack Build Phase Diff
          </Title>
          <Space size="middle">
            {data.meta.baseDate && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Base: {data.meta.baseDate}
                {data.meta.baseCommitSHA
                  ? ` (${data.meta.baseCommitSHA.slice(0, 7)})`
                  : ""}
              </Text>
            )}
            {data.meta.currentDate && (
              <Text style={{ fontSize: 13 }}>
                Current: {data.meta.currentDate}
              </Text>
            )}
          </Space>
        </Header>

        <Content style={{ padding: 24, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Card size="small">
              <Row gutter={32} align="middle">
                <Col flex="0 0 auto">
                  <Space>
                    <Text strong>Benchmark Case</Text>
                    <Select
                      value={selectedCase}
                      onChange={setSelectedCase}
                      style={{ minWidth: 320 }}
                      options={caseNames.map((name) => {
                        const diff = caseOverallDiffMap[name];
                        const label =
                          diff != null ? (
                            <Space size="small">
                              <span>{name}</span>
                              <Tag
                                color={
                                  Math.abs(diff) < 2
                                    ? "default"
                                    : diff < 0
                                      ? "success"
                                      : "error"
                                }
                                style={{ marginLeft: 4 }}
                              >
                                {diff > 0 ? "+" : ""}
                                {diff.toFixed(1)}%
                              </Tag>
                            </Space>
                          ) : (
                            name
                          );
                        return { label, value: name };
                      })}
                    />
                  </Space>
                </Col>
                <Col flex="1" style={{ display: "flex", justifyContent: "flex-end", gap: 32 }}>
                  {overall?.base && (
                    <Statistic
                      title="Base (main)"
                      value={formatMs(overall.base.mean)}
                      valueStyle={{ fontSize: 16 }}
                    />
                  )}
                  {overall?.current && (
                    <Statistic
                      title="Current (PR)"
                      value={formatMs(overall.current.mean)}
                      valueStyle={{ fontSize: 16 }}
                    />
                  )}
                  {overallDiffPercent != null && (
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", marginBottom: 2 }}>
                        Overall Diff
                      </div>
                      <Space align="baseline" size={4}>
                        {Math.abs(overallDiffPercent) >= 2 && (
                          <span style={{ color: overallDiffColor, fontSize: 14 }}>
                            {overallDiffPercent < 0 ? "\u2193" : "\u2191"}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: overallDiffColor ?? "inherit",
                          }}
                        >
                          {overallDiffPercent > 0 ? "+" : ""}
                          {overallDiffPercent.toFixed(1)}%
                        </span>
                      </Space>
                      {overallConclusion && (
                        <Text
                          style={{
                            display: "block",
                            fontSize: 12,
                            marginTop: 2,
                            color: overallDiffColor ?? "rgba(0,0,0,0.45)",
                          }}
                        >
                          {overallConclusion}
                        </Text>
                      )}
                    </div>
                  )}
                </Col>
              </Row>
            </Card>

            <Card bodyStyle={{ padding: 0 }}>
              {caseData && <PhaseTable caseData={caseData} />}
            </Card>
          </Space>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
