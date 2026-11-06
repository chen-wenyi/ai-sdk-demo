import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { useState } from "react";
import { renderToString } from "react-dom/server";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { WeijieLashingCard } from "./weijie-lashing-card";
import { WeijieLashingReport } from "@/lib/lashing/types";
import { exportLashingToCsv } from "@/lib/lashing/export";

describe("WeijieLashingCard Component (SSR & Static Verification)", () => {
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
    expect(html).toContain(
      "算力不一致：理论折算总台数 162 与填报绑扎车装台数 150 偏差 12"
    );
  });

  it("should display verified status when marked as verified by human", () => {
    const html = renderToString(
      <WeijieLashingCard report={benchmarkReport} isVerified={true} />
    );

    expect(html).toContain("已由人工核实验收");
  });
});

describe("WeijieLashingCard Interactive HITL Mode (Seam 2)", () => {
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

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should enter edit mode when clicking '编辑修正' and render edit inputs", () => {
    render(<WeijieLashingCard report={benchmarkReport} />);

    expect(screen.queryByTestId("btn-save-edit")).toBeNull();
    const editBtn = screen.getByTestId("btn-edit");
    fireEvent.click(editBtn);

    expect(screen.getByTestId("btn-save-edit")).toBeDefined();
    expect(screen.getByTestId("btn-cancel-edit")).toBeDefined();
    expect(screen.getByTestId("input-edit-date")).toBeDefined();
    expect(screen.getByTestId("input-edit-voyage")).toBeDefined();
    expect(screen.getByTestId("input-code-0")).toBeDefined();
    expect(screen.getByTestId("input-box-count-0")).toBeDefined();
    expect(screen.getByTestId("input-total-boxes")).toBeDefined();
    expect(screen.getByTestId("input-total-vehicles")).toBeDefined();
    expect(screen.getByTestId("input-leader-signature")).toBeDefined();
  });

  it("should cancel editing and restore original values when clicking '取消'", () => {
    render(<WeijieLashingCard report={benchmarkReport} />);

    fireEvent.click(screen.getByTestId("btn-edit"));
    const dateInput = screen.getByTestId("input-edit-date") as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "11月99日" } });
    expect(dateInput.value).toBe("11月99日");

    fireEvent.click(screen.getByTestId("btn-cancel-edit"));
    expect(screen.queryByTestId("btn-save-edit")).toBeNull();
    expect(screen.getByTestId("lashing-header-title").textContent).toContain("11月2日");
  });

  it("should dynamically recalculate live vehicle units when modifying box count (28 -> 30, units 162 -> 168), and save human verified report", async () => {
    function ControlledTestWrapper() {
      const [currentReport, setCurrentReport] = useState(benchmarkReport);
      return (
        <WeijieLashingCard
          report={currentReport}
          onUpdateReport={setCurrentReport}
        />
      );
    }

    render(<ControlledTestWrapper />);

    // Initially passes calculation with 162 units
    expect(screen.getByTestId("status-badge").textContent).toContain("算力校验通过");

    // Click "编辑修正"
    fireEvent.click(screen.getByTestId("btn-edit"));

    // Modify 48FR box count from 28 to 30
    const boxCountInput0 = screen.getByTestId("input-box-count-0") as HTMLInputElement;
    expect(boxCountInput0.value).toBe("28");
    fireEvent.change(boxCountInput0, { target: { value: "30" } });
    expect(boxCountInput0.value).toBe("30");

    // Live calculation: 30 * 3 + 26 * 3 = 168
    // Indicator notifies discrepancy (calculated 168 != reported 162)
    const liveIndicator = screen.getByTestId("live-calculation-indicator");
    expect(liveIndicator.textContent).toContain("168");
    expect(liveIndicator.textContent).toContain("差异 6 台");

    // One-click sync calculated values
    const syncBtn = screen.getByTestId("btn-sync-calculated");
    fireEvent.click(syncBtn);

    // After sync, live indicator shows consistent (168 units, 56 boxes)
    expect(screen.getByTestId("live-calculation-indicator").textContent).toContain(
      "实时核算一致：理论折算车装台数与填报总台数均为 168 台"
    );

    // Click "确认保存"
    fireEvent.click(screen.getByTestId("btn-save-edit"));

    // Card exits edit mode and renders "已由人工核实验收" badge
    await waitFor(() => {
      expect(screen.queryByTestId("btn-save-edit")).toBeNull();
    });

    const statusBadge = screen.getByTestId("status-badge");
    expect(statusBadge.textContent).toContain("已由人工核实验收");

    // Total vehicles in summary is now 168
    expect(screen.getByTestId("summary-total-vehicles").textContent).toContain("168");
    expect(screen.getByTestId("summary-total-boxes").textContent).toContain("56");
  });

  it("should support adding a new container column and removing a column in edit mode", () => {
    render(<WeijieLashingCard report={benchmarkReport} />);

    fireEvent.click(screen.getByTestId("btn-edit"));

    // Initial 2 items
    expect(screen.getByTestId("input-code-0")).toBeDefined();
    expect(screen.getByTestId("input-code-1")).toBeDefined();
    expect(screen.queryByTestId("input-code-2")).toBeNull();

    // Click "+ 添加箱型"
    fireEvent.click(screen.getByTestId("btn-add-column"));
    expect(screen.getByTestId("input-code-2")).toBeDefined();

    // Fill in 3rd container info
    const code2Input = screen.getByTestId("input-code-2") as HTMLInputElement;
    fireEvent.change(code2Input, { target: { value: "20GP" } });
    expect(code2Input.value).toBe("20GP");

    // Delete first column (index 0)
    fireEvent.click(screen.getByTestId("btn-remove-column-0"));

    // After removal, previous index 1 becomes index 0 ("40FM")
    const newCode0 = screen.getByTestId("input-code-0") as HTMLInputElement;
    expect(newCode0.value).toBe("40FM");
    expect(screen.queryByTestId("input-code-2")).toBeNull();
  });

  it("should copy structured JSON to clipboard when clicking '复制 JSON'", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<WeijieLashingCard report={benchmarkReport} />);

    const copyBtn = screen.getByTestId("btn-copy-json");
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain('"teamName": "E伟捷"');
    expect(copiedText).toContain('"code": "48FR"');
    expect(copiedText).toContain('"totalVehicleUnits": 162');

    // Button feedback
    await waitFor(() => {
      expect(screen.getByTestId("btn-copy-json").textContent).toContain("已复制");
    });
  });

  it("should generate CSV export correctly with UTF-8 BOM and metadata", () => {
    const csv = exportLashingToCsv(benchmarkReport);

    expect(csv.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
    expect(csv).toContain("箱型代码,箱型分类,单箱台数基准,绑扎箱数,小计车装台数");
    expect(csv).toContain('"48FR","框架箱",3,28,84');
    expect(csv).toContain('"40FM","斜架箱/框架",3,26,78');
    expect(csv).toContain('"汇总","","","","","",54,162');
    expect(csv).toContain('"队长签名","李春河"');
    expect(csv).toContain('"算力校验状态","通过"');
  });
});
