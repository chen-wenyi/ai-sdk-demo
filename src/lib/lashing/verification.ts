import {
  RawLashingInput,
  WeijieLashingReport,
  LashingItem,
  LashingTokenUsage,
  ReverseVerificationState,
} from "./types";

/**
 * Normalizes team name to canonical domain terminology "伟捷" (without "E" prefix)
 */
export function normalizeTeamName(rawTeamName: string): string {
  const trimmed = (rawTeamName || "").trim();
  if (trimmed.includes("伟捷")) {
    return "伟捷";
  }
  const cleaned = trimmed.replace(/^[A-Za-z]\s*/, "").trim();
  return cleaned || "伟捷";
}

/**
 * Rule: Any container code containing 'F' or 'f' (e.g. 48FR(3), 40FM, 40FR, 40FP)
 * is strictly "框架箱"; otherwise (e.g. 40HQ/40HC(3), 20GP(1)) it is "集装箱".
 */
export function resolveContainerType(code: string): string {
  return /f/i.test(code || "") ? "框架箱" : "集装箱";
}

/**
 * Rule: If the container code includes a number in parentheses like "48FR(3)" or "40HQ/40HC（2）",
 * the number in parentheses is the unitCapacity (对应台数). Otherwise fall back to explicit unitCapacity.
 */
export function parseUnitCapacityFromCode(
  code: string,
  fallbackCapacity?: number
): number {
  const match = (code || "").match(/[（(]\s*(\d+(?:\.\d+)?)\s*[)）]/);
  if (match && match[1]) {
    return Number(match[1]);
  }
  return Number(fallbackCapacity) || 0;
}

/**
 * Domain Verification Seam:
 * Filters non-zero items, resolves container type (F -> 框架箱, else -> 集装箱)
 * and unitCapacity from code parentheses, calculates vehicle units,
 * verifies internal consistency, and produces structured report.
 */
export function verifyLashingData(
  input: RawLashingInput,
  durationMs?: number,
  tokenUsage?: LashingTokenUsage,
  reverseVerification?: ReverseVerificationState,
  tableMeta?: {
    tableIndex?: number;
    totalTables?: number;
    positionDescription?: string;
  }
): WeijieLashingReport {
  // If allTeamRows row-by-row scan is present, locate the exact row for "伟捷" / "E伟捷"
  const scannedWeijieRow = Array.isArray(input.allTeamRows)
    ? input.allTeamRows.find((row) =>
        String(row?.rawTeamName || "").includes("伟捷")
      )
    : undefined;

  const hasValidScannedRow =
    scannedWeijieRow &&
    ((Array.isArray(scannedWeijieRow.items) &&
      scannedWeijieRow.items.some((i) => Number(i.boxCount) > 0)) ||
      Number(scannedWeijieRow.totalBoxes) > 0);

  const effectiveRow = hasValidScannedRow ? scannedWeijieRow : input;

  const teamName = normalizeTeamName(
    hasValidScannedRow ? scannedWeijieRow.rawTeamName : input.teamName
  );

  // Filter items: only include active 作业箱型 (boxCount > 0)
  const items: LashingItem[] = (effectiveRow.items || [])
    .filter((item) => Number(item.boxCount) > 0)
    .map((item) => {
      const code = item.code.trim();
      const unitCapacity = parseUnitCapacityFromCode(code, item.unitCapacity);
      const type = resolveContainerType(code);
      return {
        code,
        type,
        unitCapacity,
        boxCount: Number(item.boxCount) || 0,
      };
    });

  // Calculate sum of boxes and vehicle units
  const calculatedBoxes = items.reduce((sum, item) => sum + item.boxCount, 0);
  const calculatedVehicleUnits = items.reduce(
    (sum, item) => sum + item.boxCount * item.unitCapacity,
    0
  );

  const totalBoxes = Number(effectiveRow.totalBoxes) || calculatedBoxes;
  const totalVehicleUnits =
    effectiveRow.totalVehicleUnits !== undefined &&
    effectiveRow.totalVehicleUnits !== null
      ? Number(effectiveRow.totalVehicleUnits)
      : calculatedVehicleUnits;

  const resolvedWorkerCount =
    Number(effectiveRow.workerCount) || Number(input.workerCount) || 0;
  const resolvedLeaderSignature = (
    effectiveRow.leaderSignature ||
    input.leaderSignature ||
    ""
  ).trim();

  // Discrepancy checks
  const discrepancies: string[] = [];

  if (calculatedBoxes !== totalBoxes) {
    discrepancies.push(
      `计算绑扎箱数总计 (${calculatedBoxes}) 与填报箱数 (${totalBoxes}) 不一致`
    );
  }

  if (calculatedVehicleUnits !== totalVehicleUnits) {
    discrepancies.push(
      `计算车装台数 (${calculatedVehicleUnits}) 与填报总台数 (${totalVehicleUnits}) 不一致`
    );
  }

  const isValid = calculatedVehicleUnits === totalVehicleUnits;
  const discrepancyMessage =
    discrepancies.length > 0 ? discrepancies.join("；") : undefined;

  return {
    ...(tableMeta?.tableIndex !== undefined
      ? { tableIndex: tableMeta.tableIndex }
      : {}),
    ...(tableMeta?.totalTables !== undefined
      ? { totalTables: tableMeta.totalTables }
      : {}),
    ...(tableMeta?.positionDescription
      ? { positionDescription: tableMeta.positionDescription }
      : {}),
    teamName,
    date: (input.date || "").trim(),
    voyage: (input.voyage || "").trim(),
    items,
    totalBoxes,
    totalVehicleUnits,
    workerCount: resolvedWorkerCount,
    leaderSignature: resolvedLeaderSignature,
    calculatedVehicleUnits,
    calculatedBoxes,
    isValid,
    discrepancyMessage,
    isHumanVerified: input.isHumanVerified ?? undefined,
    durationMs,
    tokenUsage,
    reverseVerification,
  };
}
