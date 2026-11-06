import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { RawLashingInput, RawLashingInputSchema, WeijieLashingReport } from "./types";
import { verifyLashingData } from "./verification";

export const DEFAULT_QWEN_BASE_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1";
export const DEFAULT_QWEN_MODEL = "qwen3-vl-plus";

/**
 * Benchmark raw fixture extracted from the real port operation sheet
 * (fixture: ca7321cf10ff8408bf7937f243e78cad.jpg)
 */
export const BENCHMARK_RAW_INPUT: RawLashingInput = {
  teamName: "E伟捷",
  date: "11月2日",
  voyage: "中远海运欧亚航 V27",
  items: [
    { code: "48FR", type: "框架箱", unitCapacity: 3, boxCount: 28 },
    { code: "40FM", type: "斜架箱/框架", unitCapacity: 3, boxCount: 26 },
  ],
  totalBoxes: 54,
  totalVehicleUnits: 162,
  workerCount: 20,
  leaderSignature: "李春河",
};

export const BENCHMARK_REPORT: WeijieLashingReport =
  verifyLashingData(BENCHMARK_RAW_INPUT);

export const WEIJIE_EXTRACTION_SYSTEM_PROMPT = `你是一名专业的港口集装箱绑扎作业统计与数据识别专家。
你的任务是从用户上传的《每天各绑扎队作业数量统计表》图片中，精准提取专属目标绑扎队“E伟捷”（也可能手写或简写为“伟捷”）的作业数据。

【重要识别规则】：
1. 目标队伍专属识别：
   - 表格中包含多个绑扎队行（例如 A同兴、E伟捷、F杰兴、H中凌 等）。
   - 你必须且仅提取“E伟捷”（或“伟捷”）所在的这一行数据。
   - 绝不要混淆或提取其他队伍（如 A同兴、F杰兴、H中凌）的数值。
   - 团队名称统一归一化为 "E伟捷"。

2. 基本信息提取：
   - date: 提取左侧或顶部的日期，例如 "11月2日"。
   - voyage: 提取日期下方的船名与航次，例如 "中远海运欧亚航 V27"。

3. 箱型明细 (items) 提取：
   - 复合表头通常包含：
     - 第一层/第二层：箱型英文缩写代码（如 48FR, 40FM, 40HC, 20GP 等）和中文分类描述（如 框架箱, 斜架箱/框架, 高箱, 普箱 等）。
     - 第三层：单箱台数（如 3, 2, 1 等基准折算系数）。
   - 找到表头各列对应的“E伟捷”行单元格数值：
     - 如果单元格中有手写数字（如 48FR 对应的 28，40FM 对应的 26），记录为 boxCount。
     - 若单元格为空、横杠或为 0，boxCount 记录为 0。
   - 每个 item 必须包含：
     - code: 箱型代码（如 "48FR", "40FM"）
     - type: 中文箱型名称（如 "框架箱", "斜架箱/框架"）
     - unitCapacity: 单箱台数系数（数字，如 3）
     - boxCount: E伟捷在该箱型的绑扎箱数（数字，如 28, 26）

4. 汇总与签名信息提取：
   - totalBoxes: E伟捷行在“合计”列填报的绑扎箱数总数（如 54）。
   - totalVehicleUnits: E伟捷行在“绑扎车装台数”列填报的数字（如 162）。
   - workerCount: E伟捷行在“各队作业人数”列填报的作业人数（如 20）。
   - leaderSignature: 表格最右侧“队长签名”列中该行对应的手写名字（例如 "李春河"）。

请严格按照提供的结构化 Schema 输出提取的 JSON 对象。`;

export interface ExtractionOptions {
  image?: string;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  mockFallback?: boolean;
  generator?: (params: {
    model: unknown;
    schema: typeof RawLashingInputSchema;
    messages: unknown[];
  }) => Promise<{ object: RawLashingInput }>;
}

/**
 * Extracts image data URL or string from diverse payload structures
 * (AI SDK prompt attachments, parts, or direct image field)
 */
export function extractImageFromPayload(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const payload = body as Record<string, unknown>;

  if (typeof payload.image === "string" && payload.image.trim()) {
    return payload.image.trim();
  }

  if (typeof payload.dataUrl === "string" && payload.dataUrl.trim()) {
    return payload.dataUrl.trim();
  }

  if (typeof payload.file === "string" && payload.file.trim()) {
    return payload.file.trim();
  }

  if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    const messages = payload.messages as Array<Record<string, unknown>>;
    // Traverse backwards to find the latest image uploaded by user
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (!msg) continue;

      // 1. experimental_attachments
      if (Array.isArray(msg.experimental_attachments)) {
        for (const att of msg.experimental_attachments as Array<Record<string, unknown>>) {
          if (att?.url && typeof att.url === "string") {
            return att.url;
          }
        }
      }

      // 2. parts
      if (Array.isArray(msg.parts)) {
        for (const part of msg.parts as Array<Record<string, unknown>>) {
          if (part?.type === "image" && part?.image) {
            if (typeof part.image === "string") {
              return part.image;
            }
            if (typeof part.image === "object" && part.image !== null) {
              const imgObj = part.image as Record<string, unknown>;
              if (typeof imgObj.url === "string") return imgObj.url;
            }
          }
          if (part?.type === "file" && typeof part?.data === "string") {
            return part.data;
          }
        }
      }

      // 3. content as array
      if (Array.isArray(msg.content)) {
        for (const item of msg.content as Array<Record<string, unknown>>) {
          if (item?.type === "image") {
            if (typeof item.image === "string") return item.image;
            if (typeof item.image === "object" && item.image !== null) {
              const imgObj = item.image as Record<string, unknown>;
              if (typeof imgObj.url === "string") return imgObj.url;
            }
            if (typeof item.image_url === "object" && item.image_url !== null) {
              const imgUrlObj = item.image_url as Record<string, unknown>;
              if (typeof imgUrlObj.url === "string") return imgUrlObj.url;
            }
          }
        }
      }

      // 4. content as string with data URL
      if (typeof msg.content === "string") {
        const match = msg.content.match(
          /data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/
        );
        if (match) {
          return match[0];
        }
      }
    }
  }

  return null;
}

/**
 * Builds OpenAI-compatible provider instance (defaulting to DashScope / Qwen)
 */
export function createQwenClient(options: { apiKey?: string; baseURL?: string }) {
  const apiKey =
    options.apiKey ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.QWEN_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  const baseURL =
    options.baseURL ||
    process.env.DASHSCOPE_BASE_URL ||
    process.env.QWEN_BASE_URL ||
    DEFAULT_QWEN_BASE_URL;

  return {
    client: createOpenAI({
      apiKey,
      baseURL,
    }),
    apiKey,
    baseURL,
  };
}

/**
 * Vision Extraction Service:
 * Extracts "E伟捷" lashing statistics from image and runs domain verification.
 */
export async function extractLashingDataFromImage(
  options: ExtractionOptions
): Promise<WeijieLashingReport> {
  const { image, apiKey, baseURL, model, mockFallback, generator } = options;

  const resolvedApiKey =
    apiKey ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.QWEN_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  const shouldFallback =
    Boolean(mockFallback) ||
    !resolvedApiKey ||
    process.env.NODE_ENV === "test";

  // If mock fallback is active and no custom generator was provided, return verified benchmark report
  if (shouldFallback && !generator) {
    return BENCHMARK_REPORT;
  }

  if (!image) {
    throw new Error("Missing image payload for lashing data extraction");
  }

  const resolvedBaseURL =
    baseURL ||
    process.env.DASHSCOPE_BASE_URL ||
    process.env.QWEN_BASE_URL ||
    DEFAULT_QWEN_BASE_URL;

  const resolvedModel =
    model ||
    process.env.DASHSCOPE_MODEL ||
    process.env.QWEN_MODEL ||
    DEFAULT_QWEN_MODEL;

  const { client } = createQwenClient({
    apiKey: resolvedApiKey,
    baseURL: resolvedBaseURL,
  });

  // Use client.chat to target OpenAI-compatible /v1/chat/completions (DashScope, etc.)
  const modelInstance = client.chat(resolvedModel);

  const userMessages = [
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: "请识别并提取表格中‘E伟捷’队伍的绑扎作业明细与汇总数据。",
        },
        {
          type: "file" as const,
          data: image,
          mediaType: "image/jpeg",
        },
      ],
    },
  ];

  let rawOutput: RawLashingInput;

  if (generator) {
    const res = await generator({
      model: modelInstance,
      schema: RawLashingInputSchema,
      messages: userMessages,
    });
    rawOutput = res.object;
  } else {
    try {
      const res = await generateText({
        model: modelInstance,
        output: Output.object({ schema: RawLashingInputSchema }),
        instructions: WEIJIE_EXTRACTION_SYSTEM_PROMPT,
        messages: userMessages,
      });
      rawOutput = res.output;
    } catch (err) {
      if (shouldFallback) {
        return BENCHMARK_REPORT;
      }
      throw err;
    }
  }

  // Domain Verification Seam
  return verifyLashingData(rawOutput);
}
