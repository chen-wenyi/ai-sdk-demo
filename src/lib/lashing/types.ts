import { z } from "zod";

export const LashingItemSchema = z.object({
  code: z.string().describe("箱型代码，如 48FR, 40FM"),
  type: z.string().describe("箱型分类名称，如 框架箱, 斜架箱/框架"),
  unitCapacity: z.coerce.number().describe("单箱台数"),
  boxCount: z.coerce.number().describe("绑扎箱数"),
});

export type LashingItem = z.infer<typeof LashingItemSchema>;

export const RawLashingInputSchema = z.object({
  reasoning: z
    .string()
    .optional()
    .describe(
      "思维链(CoT)推理步骤：必须在填写以下数据前，先一步步写出：1.定位左侧绑扎队第2行E伟捷；2.横向逐列读取E伟捷行的非零箱型代码、单箱台数和绑扎箱数；3.读取右侧合计箱数、绑扎车装台数、作业人数与队长签名。"
    ),
  teamName: z.string().default("E伟捷"),
  date: z.string().default(""),
  voyage: z.string().default(""),
  items: z.array(LashingItemSchema).default([]),
  totalBoxes: z.coerce.number().default(0),
  totalVehicleUnits: z.coerce.number().default(0),
  workerCount: z.coerce.number().default(0),
  leaderSignature: z.string().default(""),
  isHumanVerified: z.boolean().optional(),
});

export type RawLashingInput = z.infer<typeof RawLashingInputSchema>;

export const WeijieLashingReportSchema = z.object({
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
  reasoning: z.string().optional(),
});

export type WeijieLashingReport = z.infer<typeof WeijieLashingReportSchema>;
