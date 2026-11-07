import { z } from "zod";

export const LashingItemSchema = z.object({
  code: z.string().describe("箱型代码，如 48FR(3), 40HQ/40HC(3), 48FR, 40FM"),
  type: z.string().default("框架箱").describe("箱型分类名称：代码含F必为 框架箱，否则为 集装箱"),
  unitCapacity: z.coerce.number().default(0).describe("对应台数（括号内数字或表头系数）"),
  boxCount: z.coerce.number().describe("绑扎箱数"),
});

export type LashingItem = z.infer<typeof LashingItemSchema>;

export const RawLashingInputSchema = z.object({
  teamName: z.string().default("伟捷"),
  date: z.string().default(""),
  voyage: z.string().default(""),
  items: z.array(LashingItemSchema).default([]),
  totalBoxes: z.coerce.number().default(0),
  totalVehicleUnits: z.coerce.number().default(0),
  workerCount: z.coerce.number().default(0),
  leaderSignature: z.string().default(""),
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
  reason: z.coerce.string().describe("差异原因说明，如船名错别字、串行误读、漏读非零列、手写区错位等"),
});

export type ReverseDiscrepancy = z.infer<typeof ReverseDiscrepancySchema>;

export const ReverseVerificationRawSchema = z.object({
  isMatched: z
    .boolean()
    .describe("二次反向视觉核对结果是否与首轮提取的 JSON 完全一致"),
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
