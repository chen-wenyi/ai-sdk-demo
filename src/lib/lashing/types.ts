import { z } from "zod";

export const LashingItemSchema = z.object({
  code: z.string().describe("箱型代码，如 48FR(3), 40HQ/40HC(3), 48FR, 40FM"),
  type: z.string().default("框架箱").describe("箱型分类名称：代码含F必为 框架箱，否则为 集装箱"),
  unitCapacity: z.coerce.number().default(0).describe("对应台数（括号内数字或表头系数）"),
  boxCount: z.coerce.number().describe("绑扎箱数"),
});

export type LashingItem = z.infer<typeof LashingItemSchema>;

export const TeamRowScanItemSchema = z.object({
  rowIndex: z.coerce
    .number()
    .describe("该行在表格数据区的从上往下行序号（第1个队伍行为 1，第2个队伍行为 2，第3个队伍行为 3...）"),
  rawTeamName: z
    .string()
    .describe("该行最左侧队伍列印刷或手写的名称原文，如 A同兴、E伟捷、F杰兴、H中波、合计"),
  items: z
    .array(LashingItemSchema)
    .default([])
    .describe("该横行中所有有数值（非空白）的箱型列明细"),
  totalBoxes: z.coerce.number().default(0).describe("该横行右侧的箱数合计"),
  totalVehicleUnits: z.coerce
    .number()
    .default(0)
    .describe("该横行右侧的车辆数合计 / 绑扎车装台数"),
  workerCount: z.coerce
    .number()
    .default(0)
    .describe("该横行右侧的手写绑扎人数 / 各队作业人数"),
  leaderSignature: z
    .string()
    .default("")
    .describe("该横行右侧的手写队长确认 / 队长签名"),
});

export type TeamRowScanItem = z.infer<typeof TeamRowScanItemSchema>;

export const RawLashingInputSchema = z.object({
  date: z.string().default("").describe("该张表格左上角或左侧的日期文字"),
  voyage: z.string().default("").describe("该张表格左上角或左侧的船名/航次文字"),
  allTeamRows: z
    .array(TeamRowScanItemSchema)
    .nullable()
    .optional()
    .describe(
      "【防串行强制前置步骤】必须先按从上到下的物理行顺序（第1行、第2行、第3行...），把该表格中所有有数据的队伍行（如第1行 A同兴、第2行 E伟捷、第3行 F杰兴 等）逐行完整提取出来！绝不允许跳过第1行（A同兴）直接去读第2行（E伟捷），从而避免把第1行的数字或签名误读到第2行！"
    ),
  teamName: z.string().default("伟捷").describe("目标队伍名称，统一输出为 伟捷"),
  items: z
    .array(LashingItemSchema)
    .default([])
    .describe("从上述 allTeamRows 中锁定的‘E伟捷/伟捷’那一横行的非零箱型明细"),
  totalBoxes: z.coerce
    .number()
    .default(0)
    .describe("从上述 allTeamRows 中锁定的‘E伟捷/伟捷’那一横行的箱数合计"),
  totalVehicleUnits: z.coerce
    .number()
    .default(0)
    .describe("从上述 allTeamRows 中锁定的‘E伟捷/伟捷’那一横行的车辆数合计/绑扎车装台数"),
  workerCount: z.coerce
    .number()
    .default(0)
    .describe("从上述 allTeamRows 中锁定的‘E伟捷/伟捷’那一横行的绑扎人数"),
  leaderSignature: z
    .string()
    .default("")
    .describe("从上述 allTeamRows 中锁定的‘E伟捷/伟捷’那一横行的队长确认签名"),
  isHumanVerified: z.boolean().nullable().optional(),
});

export type RawLashingInput = z.infer<typeof RawLashingInputSchema>;

export const DiscoveredTableItemSchema = z.object({
  tableIndex: z.coerce
    .number()
    .describe("表格序号，按从上到下顺序依次为 1, 2, ..."),
  positionDescription: z
    .string()
    .describe("该表格在图片中的物理位置描述，如：上半部分第1张表、下半部分第2张表"),
  dateHint: z
    .string()
    .nullable()
    .optional()
    .describe("该表格左上角或左侧的日期文字线索"),
  voyageHint: z
    .string()
    .nullable()
    .optional()
    .describe("该表格左上角或左侧的船名航次文字线索"),
});

export type DiscoveredTableItem = z.infer<typeof DiscoveredTableItemSchema>;

export const TableDiscoverySchema = z.object({
  tableCount: z.coerce
    .number()
    .describe("图片中独立绑扎统计表格的总张数（例如一页上下两张表则为 2，单张表则为 1）"),
  tables: z
    .array(DiscoveredTableItemSchema)
    .describe("按从上到下顺序排列的每张表位置与船名航次线索"),
});

export type TableDiscovery = z.infer<typeof TableDiscoverySchema>;

export const LashingTokenUsageSchema = z.object({
  totalTokens: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  imageTokens: z.number().optional(),
});

export type LashingTokenUsage = z.infer<typeof LashingTokenUsageSchema>;

export const ReverseDiscrepancySchema = z.object({
  field: z
    .string()
    .describe(
      "存在差异的字段名，如 date(日期), voyage(船名航次), 48FR(3).boxCount(箱数), totalBoxes(合计箱数), totalVehicleUnits(车装台数), workerCount(作业人数), leaderSignature(队长签名)"
    ),
  expectedByFirstPass: z.coerce.string().describe("首轮提取的值"),
  foundInSecondPass: z.coerce.string().describe("二次反向核对在原图中看到的真实值"),
  reason: z.coerce.string().describe("差异原因说明，如串行误读了上一行A同兴的数据、船名错别字、漏读非零列、手写区错位等"),
});

export type ReverseDiscrepancy = z.infer<typeof ReverseDiscrepancySchema>;

export const ReverseVerificationRawSchema = z.object({
  allRowsAudit: z
    .array(TeamRowScanItemSchema)
    .nullable()
    .optional()
    .describe(
      "【防串行强制前置步骤】在判断 isMatched 之前，必须先按从上到下的顺序逐行抄录该表中所有有数据的队伍行（如第1行 A同兴、第2行 E伟捷、第3行 F杰兴...），明确区分第1行与第2行的数字和签名！"
    ),
  isMatched: z
    .boolean()
    .describe(
      "对比上述 allRowsAudit 中‘E伟捷/伟捷’行的真实数据与首轮提取 JSON 是否完全一致（若首轮把第1行 A同兴 的数字或签名误读成了第2行 E伟捷，必须设为 false！）"
    ),
  summary: z.string().describe("简明扼要的二次反向核对结论说明"),
  discrepancies: z
    .array(ReverseDiscrepancySchema)
    .nullable()
    .optional()
    .describe("若存在不一致，列出所有差异字段；若完全一致则为空数组"),
  correctedData: RawLashingInputSchema.nullable()
    .optional()
    .describe("若发现差异，提供二次修正后的完整伟捷行数据；若完全一致则为 null"),
});

export type ReverseVerificationRaw = z.infer<typeof ReverseVerificationRawSchema>;

export const ReverseVerificationStateSchema = z.object({
  status: z.enum(["idle", "verifying", "passed", "mismatch", "error"]),
  isMatched: z.boolean().optional(),
  summary: z.string().optional(),
  discrepancies: z.array(ReverseDiscrepancySchema).default([]),
  correctedData: RawLashingInputSchema.nullable().optional(),
  durationMs: z.number().optional(),
  tokenUsage: LashingTokenUsageSchema.optional(),
});

export type ReverseVerificationState = z.infer<typeof ReverseVerificationStateSchema>;

export const WeijieLashingReportSchema = z.object({
  tableIndex: z.number().optional(),
  totalTables: z.number().optional(),
  positionDescription: z.string().optional(),
  teamName: z.string(),
  date: z.string(),
  voyage: z.string(),
  items: z.array(LashingItemSchema),
  totalBoxes: z.number(),
  totalVehicleUnits: z.number(),
  workerCount: z.number(),
  leaderSignature: z.string(),
  calculatedVehicleUnits: z.number(),
  calculatedBoxes: z.number().optional(),
  isValid: z.boolean(),
  discrepancyMessage: z.string().optional(),
  isHumanVerified: z.boolean().optional(),
  durationMs: z.number().optional(),
  tokenUsage: LashingTokenUsageSchema.optional(),
  reverseVerification: ReverseVerificationStateSchema.optional(),
});

export type WeijieLashingReport = z.infer<typeof WeijieLashingReportSchema>;
