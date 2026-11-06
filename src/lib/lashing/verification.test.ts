import { describe, it, expect } from "vitest";
import { verifyLashingData } from "./verification";
import { RawLashingInput } from "./types";

describe("Domain Verification Seam (verifyLashingData)", () => {
  it("should correctly verify typical Weijie lashing data (48FR: 28*3, 40FM: 26*3, total 162)", () => {
    const input: RawLashingInput = {
      teamName: "E伟捷",
      date: "11月2日",
      voyage: "中远海运欧亚航 V27",
      items: [
        { code: "48FR", type: "框架箱", unitCapacity: 3, boxCount: 28 },
        { code: "40FM", type: "斜架箱/框架", unitCapacity: 3, boxCount: 26 },
        { code: "40HC", type: "高箱", unitCapacity: 2, boxCount: 0 },
        { code: "20GP", type: "普箱", unitCapacity: 1, boxCount: 0 },
      ],
      totalBoxes: 54,
      totalVehicleUnits: 162,
      workerCount: 20,
      leaderSignature: "李春河",
    };

    const report = verifyLashingData(input);

    expect(report.teamName).toBe("E伟捷");
    expect(report.date).toBe("11月2日");
    expect(report.voyage).toBe("中远海运欧亚航 V27");
    // Filtered items should only contain non-zero items
    expect(report.items).toHaveLength(2);
    expect(report.items.map((i) => i.code)).toEqual(["48FR", "40FM"]);
    // Calculations: 28*3 + 26*3 = 84 + 78 = 162
    expect(report.calculatedVehicleUnits).toBe(162);
    expect(report.totalVehicleUnits).toBe(162);
    expect(report.totalBoxes).toBe(54);
    expect(report.isValid).toBe(true);
    expect(report.discrepancyMessage).toBeUndefined();
    expect(report.leaderSignature).toBe("李春河");
  });

  it("should flag discrepancy when calculated vehicle units do not match totalVehicleUnits", () => {
    const input: RawLashingInput = {
      teamName: "E伟捷",
      date: "11月2日",
      voyage: "中远海运欧亚航 V27",
      items: [
        { code: "48FR", type: "框架箱", unitCapacity: 3, boxCount: 28 },
        { code: "40FM", type: "斜架箱/框架", unitCapacity: 3, boxCount: 26 },
      ],
      totalBoxes: 54,
      totalVehicleUnits: 160, // Misidentified or manual error in raw sheet
      workerCount: 20,
      leaderSignature: "李春河",
    };

    const report = verifyLashingData(input);

    expect(report.calculatedVehicleUnits).toBe(162);
    expect(report.totalVehicleUnits).toBe(160);
    expect(report.isValid).toBe(false);
    expect(report.discrepancyMessage).toContain("162");
    expect(report.discrepancyMessage).toContain("160");
  });

  it("should report discrepancy notice when calculated box sum does not match totalBoxes while keeping isValid true if vehicle units match", () => {
    const input: RawLashingInput = {
      teamName: "E伟捷",
      date: "11月2日",
      voyage: "中远海运欧亚航 V27",
      items: [
        { code: "48FR", type: "框架箱", unitCapacity: 3, boxCount: 28 },
        { code: "40FM", type: "斜架箱/框架", unitCapacity: 3, boxCount: 26 },
      ],
      totalBoxes: 50, // Does not match 28 + 26 = 54
      totalVehicleUnits: 162,
      workerCount: 20,
      leaderSignature: "李春河",
    };

    const report = verifyLashingData(input);

    expect(report.isValid).toBe(true);
    expect(report.discrepancyMessage).toContain("54");
    expect(report.discrepancyMessage).toContain("50");
  });

  it("should normalize team name to E伟捷 when given 伟捷 or whitespace variations", () => {
    const input: RawLashingInput = {
      teamName: "伟捷",
      date: "11月2日",
      voyage: "中远海运欧亚航 V27",
      items: [
        { code: "48FR", type: "框架箱", unitCapacity: 3, boxCount: 10 },
      ],
      totalBoxes: 10,
      totalVehicleUnits: 30,
      workerCount: 10,
      leaderSignature: "李春河",
    };

    const report = verifyLashingData(input);

    expect(report.teamName).toBe("E伟捷");
    expect(report.isValid).toBe(true);
  });

  it("should handle empty or all-zero items gracefully", () => {
    const input: RawLashingInput = {
      teamName: "E伟捷",
      date: "11月2日",
      voyage: "中远海运欧亚航 V27",
      items: [
        { code: "48FR", type: "框架箱", unitCapacity: 3, boxCount: 0 },
      ],
      totalBoxes: 0,
      totalVehicleUnits: 0,
      workerCount: 0,
      leaderSignature: "",
    };

    const report = verifyLashingData(input);

    expect(report.items).toHaveLength(0);
    expect(report.calculatedVehicleUnits).toBe(0);
    expect(report.isValid).toBe(true);
  });
});
