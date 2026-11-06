import {
  RawLashingInput,
  WeijieLashingReport,
  LashingItem,
  LashingTokenUsage,
} from "./types";

/**
 * Normalizes team name to canonical domain terminology "E伟捷"
 */
export function normalizeTeamName(rawTeamName: string): string {
  const trimmed = (rawTeamName || "").trim();
  if (trimmed.includes("伟捷")) {
    return "E伟捷";
  }
  return trimmed || "E伟捷";
}

/**
 * Domain Verification Seam:
 * Filters non-zero items, calculates vehicle units from coefficients,
 * verifies internal consistency, and produces structured report.
 */
export function verifyLashingData(
  input: RawLashingInput,
  durationMs?: number,
  tokenUsage?: LashingTokenUsage
): WeijieLashingReport {
  const teamName = normalizeTeamName(input.teamName);

  // Filter items: only include active作業箱型 (boxCount > 0)
  const items: LashingItem[] = (input.items || [])
    .filter((item) => Number(item.boxCount) > 0)
    .map((item) => ({
      code: item.code.trim(),
      type: item.type.trim(),
      unitCapacity: Number(item.unitCapacity) || 0,
      boxCount: Number(item.boxCount) || 0,
    }));

  // Calculate sum of boxes and vehicle units
  const calculatedBoxes = items.reduce((sum, item) => sum + item.boxCount, 0);
  const calculatedVehicleUnits = items.reduce(
    (sum, item) => sum + item.boxCount * item.unitCapacity,
    0
  );

  const totalBoxes = Number(input.totalBoxes) || calculatedBoxes;
  const totalVehicleUnits =
    input.totalVehicleUnits !== undefined && input.totalVehicleUnits !== null
      ? Number(input.totalVehicleUnits)
      : calculatedVehicleUnits;

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

  // Per spec line 59: isValid is strictly calculatedVehicleUnits === totalVehicleUnits.
  // Discrepancy in box count is reported in discrepancyMessage as an informational notice.
  const isValid = calculatedVehicleUnits === totalVehicleUnits;
  const discrepancyMessage =
    discrepancies.length > 0 ? discrepancies.join("；") : undefined;

  return {
    teamName,
    date: (input.date || "").trim(),
    voyage: (input.voyage || "").trim(),
    items,
    totalBoxes,
    totalVehicleUnits,
    workerCount: Number(input.workerCount) || 0,
    leaderSignature: (input.leaderSignature || "").trim(),
    calculatedVehicleUnits,
    calculatedBoxes,
    isValid,
    discrepancyMessage,
    isHumanVerified: input.isHumanVerified,
    durationMs,
    tokenUsage,
  };
}
