import { z } from "zod";

export const LashingItemSchema = z.object({
  code: z.string().describe("箱型代码，如 48FR, 40FM"),
  type: z.string().describe("箱型分类名称，如 框架箱, 斜架箱/框架"),
  unitCapacity: z.number().describe("单箱台数基准系数"),
  boxCount: z.number().describe("绑扎箱数"),
});

export type LashingItem = z.infer<typeof LashingItemSchema>;

export const RawLashingInputSchema = z.object({
  teamName: z.string().default("E伟捷"),
  date: z.string().default(""),
  voyage: z.string().default(""),
  items: z.array(LashingItemSchema).default([]),
  totalBoxes: z.number().default(0),
  totalVehicleUnits: z.number().default(0),
  workerCount: z.number().default(0),
  leaderSignature: z.string().default(""),
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
  isValid: z.boolean(),
  discrepancyMessage: z.string().optional(),
});

export type WeijieLashingReport = z.infer<typeof WeijieLashingReportSchema>;
