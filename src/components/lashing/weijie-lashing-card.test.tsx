import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { WeijieLashingCard } from "./weijie-lashing-card";
import { WeijieLashingReport } from "@/lib/lashing/types";

describe("WeijieLashingCard Component", () => {
  const benchmarkReport: WeijieLashingReport = {
    teamName: "E伟捷",
    date: "11月2日",
    voyage: "中远海运欧亚航 V27",
    items: [
      {
        code: "48FR",
        type: "框架箱",
        unitCapacity: 3,
        boxCount: 28,
      },
      {
        code: "40FM",
        type: "斜架箱/框架",
        unitCapacity: 3,
        boxCount: 26,
      },
    ],
    totalBoxes: 54,
    totalVehicleUnits: 162,
    workerCount: 20,
    leaderSignature: "李春河",
    calculatedVehicleUnits: 162,
    isValid: true,
  };

  it("should render card header with team, date, voyage, and valid badge", () => {
    const html = renderToString(<WeijieLashingCard report={benchmarkReport} />);

    expect(html).toContain("E伟捷");
    expect(html).toContain("11月2日");
    expect(html).toContain("中远海运欧亚航 V27");
    expect(html).toContain("算力校验通过");
  });

  it("should render the horizontal transposed table with 4 distinct rows", () => {
    const html = renderToString(<WeijieLashingCard report={benchmarkReport} />);

    // Row 1: 箱型代码
    expect(html).toContain("箱型代码");
    expect(html).toContain("48FR");
    expect(html).toContain("40FM");

    // Row 2: 箱型
    expect(html).toContain("箱型");
    expect(html).toContain("框架箱");
    expect(html).toContain("斜架箱/框架");

    // Row 3: 对应台数
    expect(html).toContain("对应台数");

    // Row 4: 绑扎箱数
    expect(html).toContain("绑扎箱数");
    expect(html).toContain("28");
    expect(html).toContain("26");

    // Check data-testid anchors
    expect(html).toContain('data-testid="row-code"');
    expect(html).toContain('data-testid="row-type"');
    expect(html).toContain('data-testid="row-capacity"');
    expect(html).toContain('data-testid="row-box-count"');
  });

  it("should render footer metadata with totals and team leader signature", () => {
    const html = renderToString(<WeijieLashingCard report={benchmarkReport} />);

    expect(html).toContain("合计箱数:");
    expect(html).toContain("54");
    expect(html).toContain("绑扎车装台数:");
    expect(html).toContain("162");
    expect(html).toContain("各队作业人数:");
    expect(html).toContain("20");
    expect(html).toContain("队长签名:");
    expect(html).toContain("李春河");
  });

  it("should render discrepancy warning when calculated units mismatch", () => {
    const discrepancyReport: WeijieLashingReport = {
      ...benchmarkReport,
      totalVehicleUnits: 150,
      calculatedVehicleUnits: 162,
      isValid: false,
      discrepancyMessage:
        "算力不一致：理论折算总台数 162 与填报绑扎车装台数 150 偏差 12",
    };

    const html = renderToString(
      <WeijieLashingCard report={discrepancyReport} />
    );

    expect(html).toContain("算力存在偏差");
    expect(html).toContain("算力不一致：理论折算总台数 162 与填报绑扎车装台数 150 偏差 12");
  });

  it("should display verified status when marked as verified by human", () => {
    const html = renderToString(
      <WeijieLashingCard report={benchmarkReport} isVerified={true} />
    );

    expect(html).toContain("已由人工核实验收");
  });
});
