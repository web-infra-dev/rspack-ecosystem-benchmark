import { createRoot } from "react-dom/client";
import { App } from "./App";
import type { BenchmarkData } from "./utils/types";

declare global {
  interface Window {
    __BENCHMARK_DATA__: BenchmarkData | string;
  }
}

function getData(): BenchmarkData {
  const raw = window.__BENCHMARK_DATA__;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      // Development mode: use mock data
      return getMockData();
    }
  }
  return raw;
}

function getMockData(): BenchmarkData {
  return {
    meta: {
      baseDate: "2025-03-01",
      baseCommitSHA: "abc1234def5678",
      generatedAt: new Date().toISOString(),
    },
    cases: {
      "10000_production-mode": {
        base: {
          stats: { min: 3000, max: 3500, mean: 3200, median: 3150, variance: 1000, stdDev: 31, confidence: 45, low: 3155, high: 3245, count: 10 },
          exec: { min: 1800, max: 2200, mean: 1950, median: 1900, variance: 800, stdDev: 28, confidence: 40, low: 1910, high: 1990, count: 10 },
          "Compiler.make": { min: 1100, max: 1500, mean: 1300, median: 1250, variance: 500, stdDev: 22, confidence: 32, low: 1268, high: 1332, count: 10 },
          "Compiler.seal compilation": { min: 2800, max: 3200, mean: 2950, median: 2900, variance: 600, stdDev: 24, confidence: 35, low: 2915, high: 2985, count: 10 },
          "Compiler.emitAssets": { min: 10, max: 30, mean: 15, median: 12, variance: 20, stdDev: 4, confidence: 6, low: 9, high: 21, count: 10 },
          "Compilation.code generation": { min: 700, max: 850, mean: 760, median: 740, variance: 300, stdDev: 17, confidence: 24, low: 736, high: 784, count: 10 },
          "Compilation.optimize": { min: 400, max: 550, mean: 450, median: 430, variance: 200, stdDev: 14, confidence: 20, low: 430, high: 470, count: 10 },
          "Compilation.process assets": { min: 1200, max: 1400, mean: 1300, median: 1280, variance: 400, stdDev: 20, confidence: 28, low: 1272, high: 1328, count: 10 },
          "Compilation.create chunks": { min: 200, max: 300, mean: 240, median: 230, variance: 100, stdDev: 10, confidence: 14, low: 226, high: 254, count: 10 },
          "Compilation.optimize dependencies": { min: 200, max: 320, mean: 260, median: 250, variance: 150, stdDev: 12, confidence: 17, low: 243, high: 277, count: 10 },
        },
        current: {
          stats: { min: 2800, max: 3200, mean: 2950, median: 2900, variance: 900, stdDev: 30, confidence: 43, low: 2907, high: 2993, count: 10 },
          exec: { min: 1600, max: 2000, mean: 1780, median: 1750, variance: 700, stdDev: 26, confidence: 37, low: 1743, high: 1817, count: 10 },
          "Compiler.make": { min: 1100, max: 1400, mean: 1280, median: 1250, variance: 450, stdDev: 21, confidence: 30, low: 1250, high: 1310, count: 10 },
          "Compiler.seal compilation": { min: 2500, max: 2900, mean: 2650, median: 2600, variance: 500, stdDev: 22, confidence: 32, low: 2618, high: 2682, count: 10 },
          "Compiler.emitAssets": { min: 10, max: 25, mean: 14, median: 12, variance: 15, stdDev: 3, confidence: 5, low: 9, high: 19, count: 10 },
          "Compilation.code generation": { min: 650, max: 800, mean: 700, median: 690, variance: 250, stdDev: 15, confidence: 22, low: 678, high: 722, count: 10 },
          "Compilation.optimize": { min: 350, max: 480, mean: 400, median: 390, variance: 180, stdDev: 13, confidence: 19, low: 381, high: 419, count: 10 },
          "Compilation.process assets": { min: 1100, max: 1300, mean: 1180, median: 1170, variance: 350, stdDev: 18, confidence: 26, low: 1154, high: 1206, count: 10 },
          "Compilation.create chunks": { min: 200, max: 280, mean: 235, median: 225, variance: 90, stdDev: 9, confidence: 13, low: 222, high: 248, count: 10 },
          "Compilation.optimize dependencies": { min: 180, max: 300, mean: 240, median: 235, variance: 130, stdDev: 11, confidence: 16, low: 224, high: 256, count: 10 },
        },
      },
    },
  };
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App data={getData()} />);
}
