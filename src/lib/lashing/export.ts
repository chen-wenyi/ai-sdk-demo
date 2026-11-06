import { WeijieLashingReport } from "./types";

/**
 * Exports WeijieLashingReport to a clean, standard CSV formatted string with UTF-8 BOM for Excel compatibility.
 */
export function exportLashingToCsv(report: WeijieLashingReport): string {
  const headers = [
    "队伍",
    "日期",
    "航次",
    "箱型代码",
    "箱型分类",
    "单箱台数基准",
    "绑扎箱数",
    "小计车装台数",
  ];

  const rows = (report.items || []).map((item) => [
    `"${report.teamName || "E伟捷"}"`,
    `"${report.date || ""}"`,
    `"${report.voyage || ""}"`,
    `"${item.code}"`,
    `"${item.type}"`,
    item.unitCapacity,
    item.boxCount,
    item.unitCapacity * item.boxCount,
  ]);

  const summaryRow = [
    `"汇总"`,
    `""`,
    `""`,
    `""`,
    `""`,
    `""`,
    report.totalBoxes,
    report.totalVehicleUnits,
  ];

  const metaRows = [
    [`"各队作业人数"`, report.workerCount],
    [`"队长签名"`, `"${report.leaderSignature || "未签署"}"`],
    [
      `"算力校验状态"`,
      report.isValid ? `"通过"` : `"存在偏差: ${report.discrepancyMessage || ""}"`,
    ],
    [`"核验模式"`, report.isHumanVerified ? `"人工已核实验收"` : `"AI 自动识别"`],
  ];

  const lines = [
    headers.join(","),
    ...rows.map((r) => r.join(",")),
    summaryRow.join(","),
    "",
    ...metaRows.map((r) => r.join(",")),
  ];

  return "\uFEFF" + lines.join("\n");
}
