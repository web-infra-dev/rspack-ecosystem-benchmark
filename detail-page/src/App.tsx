import { ConfigProvider, Layout, Select, Typography, Space, Card, Statistic, Row, Col, Tag, Spin, Alert } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { BenchmarkData } from "./utils/types";
import { PhaseTable } from "./components/PhaseTable";
import { formatMs } from "./utils/formatting";
import { getOverallStats } from "./utils/phaseHierarchy";
import { fetchBenchmarkData, getUrlParams } from "./utils/fetchData";

const { Header, Content } = Layout;
const { Title } = Typography;

export function App() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { base, id, hash } = getUrlParams();

  useEffect(() => {
    fetchBenchmarkData(base, id, hash)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [base, id, hash]);

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
        <Alert type="error" message="Failed to load benchmark data" description={error} showIcon />
      </div>
    );
  }

  return <AppContent data={data} />;
}

function AppContent({ data }: { data: BenchmarkData }) {
  const caseNames = useMemo(() => Object.keys(data.cases), [data]);
  const [selectedCase, setSelectedCase] = useState(caseNames[0] ?? "");

  const caseData = data.cases[selectedCase];
  const overall = caseData ? getOverallStats(caseData) : undefined;

  const overallDiffPercent =
    overall?.base && overall?.current
      ? ((overall.current.mean - overall.base.mean) / overall.base.mean) * 100
      : undefined;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
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
          <Space>
            {data.meta.baseDate && (
              <Tag>
                Base: {data.meta.baseDate}
                {data.meta.baseCommitSHA
                  ? ` (${data.meta.baseCommitSHA.slice(0, 7)})`
                  : ""}
              </Tag>
            )}
            {data.meta.currentDate && (
              <Tag color="blue">Current: {data.meta.currentDate}</Tag>
            )}
          </Space>
        </Header>

        <Content style={{ padding: 24, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Card size="small">
              <Row gutter={24} align="middle">
                <Col>
                  <Space>
                    <span style={{ fontWeight: 500 }}>Benchmark Case:</span>
                    <Select
                      value={selectedCase}
                      onChange={setSelectedCase}
                      style={{ minWidth: 320 }}
                      options={caseNames.map((name) => ({ label: name, value: name }))}
                    />
                  </Space>
                </Col>
                {overall?.base && (
                  <Col>
                    <Statistic
                      title="Base Total"
                      value={formatMs(overall.base.mean)}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Col>
                )}
                {overall?.current && (
                  <Col>
                    <Statistic
                      title="Current Total"
                      value={formatMs(overall.current.mean)}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Col>
                )}
                {overallDiffPercent != null && (
                  <Col>
                    <Statistic
                      title="Overall Diff"
                      value={`${overallDiffPercent > 0 ? "+" : ""}${overallDiffPercent.toFixed(1)}%`}
                      valueStyle={{
                        fontSize: 16,
                        color:
                          Math.abs(overallDiffPercent) < 2
                            ? undefined
                            : overallDiffPercent < 0
                            ? "#3f8600"
                            : "#cf1322",
                      }}
                    />
                  </Col>
                )}
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
