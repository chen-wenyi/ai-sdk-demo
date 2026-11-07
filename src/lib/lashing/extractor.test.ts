import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  extractImageFromPayload,
  createQwenClient,
  extractLashingDataFromImage,
  extractMultipleTablesFromImage,
  parseLashingJsonFromText,
  extractDashScopeUsage,
  reverseVerifyLashingData,
  DEFAULT_QWEN_BASE_URL,
} from "./extractor";
import { RawLashingInput } from "./types";

describe("Extractor Utilities", () => {
  it("should extract DashScope token usage including image_tokens", () => {
    const rawUsage = {
      prompt_tokens: 3196,
      completion_tokens: 190,
      total_tokens: 3386,
      prompt_tokens_details: {
        image_tokens: 1902,
      },
    };
    const usage = extractDashScopeUsage(rawUsage);
    expect(usage).toEqual({
      inputTokens: 3196,
      outputTokens: 190,
      totalTokens: 3386,
      imageTokens: 1902,
    });
  });

  it("should accept DashScope reverse verification JSON when correctedData is null", async () => {
    const { ReverseVerificationRawSchema } = await import("./types");
    const dashscopePayload = {
      isMatched: true,
      summary:
        "经反向视觉核对，'伟捷'行数据与原图完全一致。",
      discrepancies: [],
      correctedData: null,
    };
    const parsed = ReverseVerificationRawSchema.safeParse(dashscopePayload);
    expect(parsed.success).toBe(true);
  });

  it("should extract image from direct string fields (image, dataUrl, file)", () => {
    const direct1 = extractImageFromPayload({
      image: "data:image/jpeg;base64,abc1234",
    });
    expect(direct1).toBe("data:image/jpeg;base64,abc1234");

    const direct2 = extractImageFromPayload({
      dataUrl: "data:image/png;base64,xyz789",
    });
    expect(direct2).toBe("data:image/png;base64,xyz789");

    const direct3 = extractImageFromPayload({
      file: "data:image/webp;base64,uvw456",
    });
    expect(direct3).toBe("data:image/webp;base64,uvw456");
  });

  it("should extract image from AI SDK experimental_attachments", () => {
    const payload = {
      messages: [
        {
          role: "user",
          content: "Please analyze this sheet",
          experimental_attachments: [
            {
              url: "data:image/jpeg;base64,attach123",
              contentType: "image/jpeg",
            },
          ],
        },
      ],
    };

    expect(extractImageFromPayload(payload)).toBe(
      "data:image/jpeg;base64,attach123"
    );
  });

  it("should extract image from AI SDK parts", () => {
    const payload = {
      messages: [
        {
          role: "user",
          parts: [
            { type: "text", text: "Here is the table" },
            { type: "image", image: "data:image/jpeg;base64,partImage123" },
          ],
        },
      ],
    };

    expect(extractImageFromPayload(payload)).toBe(
      "data:image/jpeg;base64,partImage123"
    );
  });

  it("should extract image from content array or embedded data URL string", () => {
    const arrayPayload = {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Look" },
            {
              type: "image",
              image_url: { url: "data:image/jpeg;base64,arrayUrl123" },
            },
          ],
        },
      ],
    };
    expect(extractImageFromPayload(arrayPayload)).toBe(
      "data:image/jpeg;base64,arrayUrl123"
    );

    const stringPayload = {
      messages: [
        {
          role: "user",
          content: "Image data:image/png;base64,regexMatch456 embedded here",
        },
      ],
    };
    expect(extractImageFromPayload(stringPayload)).toBe(
      "data:image/png;base64,regexMatch456"
    );
  });

  it("should return null when no image is present", () => {
    expect(extractImageFromPayload({})).toBeNull();
    expect(extractImageFromPayload(null)).toBeNull();
    expect(
      extractImageFromPayload({
        messages: [{ role: "user", content: "Just plain text" }],
      })
    ).toBeNull();
  });

  it("should configure Qwen client with defaults or custom headers", () => {
    const defaultClient = createQwenClient({});
    expect(defaultClient.baseURL).toBe(DEFAULT_QWEN_BASE_URL);

    const customClient = createQwenClient({
      apiKey: "custom-key-123",
      baseURL: "https://custom.endpoint.com/v1",
    });
    expect(customClient.apiKey).toBe("custom-key-123");
    expect(customClient.baseURL).toBe("https://custom.endpoint.com/v1");
  });

  it("should parse valid JSON from markdown code blocks and coerced string numbers", () => {
    const rawAiResponse = `
\`\`\`json
{
  "teamName": "伟捷",
  "date": "11月2日",
  "voyage": "中远海运欧亚航 V27",
  "items": [
    { "code": "48FR", "type": "框架箱", "unitCapacity": "3", "boxCount": "28" },
    { "code": "40FM", "type": "框架箱", "unitCapacity": "3", "boxCount": "26" }
  ],
  "totalBoxes": "54",
  "totalVehicleUnits": "162",
  "workerCount": "20",
  "leaderSignature": "李春河"
}
\`\`\`
`;
    const parsed = parseLashingJsonFromText(rawAiResponse);
    expect(parsed).not.toBeNull();
    expect(parsed?.teamName).toBe("伟捷");
    expect(parsed?.totalBoxes).toBe(54);
    expect(parsed?.totalVehicleUnits).toBe(162);
    expect(parsed?.items[0].boxCount).toBe(28);
    expect(parsed?.items[1].boxCount).toBe(26);
    expect(parsed?.leaderSignature).toBe("李春河");
  });

  it("should parse outer curly braces without markdown code block", () => {
    const textWithBraces = `分析完成：{"teamName":"伟捷","date":"11月2日","voyage":"测试航次","items":[{"code":"48FR","type":"框架箱","unitCapacity":3,"boxCount":28}],"totalBoxes":28,"totalVehicleUnits":84,"workerCount":10,"leaderSignature":"李春河"} 以上为识别结果。`;
    const parsed = parseLashingJsonFromText(textWithBraces);
    expect(parsed).not.toBeNull();
    expect(parsed?.teamName).toBe("伟捷");
    expect(parsed?.totalBoxes).toBe(28);
  });

  it("should return null on invalid JSON or unparseable text", () => {
    expect(parseLashingJsonFromText("这是一段没有任何 JSON 的文本")).toBeNull();
    expect(parseLashingJsonFromText("```json { invalid json } ```")).toBeNull();
    expect(parseLashingJsonFromText("")).toBeNull();
  });
});

describe("extractLashingDataFromImage Service", () => {
  it("should return benchmark report in fallback mode when no API key is provided", async () => {
    const report = await extractLashingDataFromImage({
      image: "data:image/jpeg;base64,dummy",
      mockFallback: true,
    });

    expect(report.teamName).toBe("伟捷");
    expect(report.date).toBe("11月2日");
    expect(report.voyage).toBe("中远海运欧亚航 V27");
    expect(report.items).toHaveLength(2);
    expect(report.items[0]).toEqual({
      code: "48FR",
      type: "框架箱",
      unitCapacity: 3,
      boxCount: 28,
    });
    expect(report.items[1]).toEqual({
      code: "40FM",
      type: "框架箱",
      unitCapacity: 3,
      boxCount: 26,
    });
    expect(report.totalBoxes).toBe(54);
    expect(report.totalVehicleUnits).toBe(162);
    expect(report.calculatedVehicleUnits).toBe(162);
    expect(report.isValid).toBe(true);
    expect(report.workerCount).toBe(20);
    expect(report.leaderSignature).toBe("李春河");
  });

  it("should invoke custom generator and pass through verifyLashingData", async () => {
    const mockRaw: RawLashingInput = {
      teamName: "E伟捷",
      date: "11月3日",
      voyage: "中远海运星座航 V01",
      items: [
        { code: "48FR(3)", type: "框架箱", unitCapacity: 3, boxCount: 10 },
        { code: "40HQ/40HC(3)", type: "集装箱", unitCapacity: 3, boxCount: 20 },
        { code: "20GP(1)", type: "集装箱", unitCapacity: 1, boxCount: 0 }, // Should be filtered out
      ],
      totalBoxes: 30,
      totalVehicleUnits: 90,
      workerCount: 15,
      leaderSignature: "张三",
    };

    const customGenerator = async () => ({
      object: mockRaw,
    });

    const report = await extractLashingDataFromImage({
      image: "data:image/jpeg;base64,custom",
      apiKey: "test-key",
      generator: customGenerator,
    });

    expect(report.teamName).toBe("伟捷");
    expect(report.date).toBe("11月3日");
    expect(report.items).toHaveLength(2);
    expect(report.items[0].type).toBe("框架箱");
    expect(report.items[1].type).toBe("集装箱");
    expect(report.calculatedVehicleUnits).toBe(90);
    expect(report.isValid).toBe(true);
    expect(report.leaderSignature).toBe("张三");
  });

  it("should orchestrate Master-Worker multi-table extraction for 2 stacked tables", async () => {
    const result = await extractMultipleTablesFromImage({
      image: "data:image/jpeg;base64,twoTablesSheet",
      apiKey: "test-key",
      masterGenerator: async () => ({
        object: {
          tableCount: 2,
          tables: [
            {
              tableIndex: 1,
              positionDescription: "上半部分第1张表",
              dateHint: "2026.10.28",
              voyageHint: "绿上海 V6",
            },
            {
              tableIndex: 2,
              positionDescription: "下半部分第2张表",
              dateHint: "2026.10.28",
              voyageHint: "蓝宝石 V6",
            },
          ],
        },
      }),
      subGenerator: async ({ table }) => {
        if (table.tableIndex === 1) {
          return {
            object: {
              teamName: "E伟捷",
              date: "2026.10.28",
              voyage: "绿上海 V6",
              items: [
                { code: "48FR(3)", type: "框架箱", unitCapacity: 3, boxCount: 5 },
                { code: "40HQ/40HC(3)", type: "集装箱", unitCapacity: 3, boxCount: 41 },
              ],
              totalBoxes: 46,
              totalVehicleUnits: 138,
              workerCount: 17,
              leaderSignature: "郭相帅",
            },
          };
        }
        return {
          object: {
            teamName: "E伟捷",
            date: "2026.10.28",
            voyage: "蓝宝石 V6",
            items: [
              { code: "48FR(3)", type: "框架箱", unitCapacity: 3, boxCount: 35 },
              { code: "40HQ/40HC(2)", type: "集装箱", unitCapacity: 2, boxCount: 4 },
            ],
            totalBoxes: 39,
            totalVehicleUnits: 113,
            workerCount: 17,
            leaderSignature: "郭相帅",
          },
        };
      },
    });

    expect(result.tableCount).toBe(2);
    expect(result.reports).toHaveLength(2);

    // Table 1: 绿上海 V6
    expect(result.reports[0].tableIndex).toBe(1);
    expect(result.reports[0].totalTables).toBe(2);
    expect(result.reports[0].teamName).toBe("伟捷");
    expect(result.reports[0].voyage).toBe("绿上海 V6");
    expect(result.reports[0].items[0]).toEqual({
      code: "48FR(3)",
      type: "框架箱",
      unitCapacity: 3,
      boxCount: 5,
    });
    expect(result.reports[0].items[1]).toEqual({
      code: "40HQ/40HC(3)",
      type: "集装箱",
      unitCapacity: 3,
      boxCount: 41,
    });
    expect(result.reports[0].calculatedVehicleUnits).toBe(138);
    expect(result.reports[0].isValid).toBe(true);

    // Table 2: 蓝宝石 V6
    expect(result.reports[1].tableIndex).toBe(2);
    expect(result.reports[1].totalTables).toBe(2);
    expect(result.reports[1].teamName).toBe("伟捷");
    expect(result.reports[1].voyage).toBe("蓝宝石 V6");
    expect(result.reports[1].items[0]).toEqual({
      code: "48FR(3)",
      type: "框架箱",
      unitCapacity: 3,
      boxCount: 35,
    });
    expect(result.reports[1].items[1]).toEqual({
      code: "40HQ/40HC(2)",
      type: "集装箱",
      unitCapacity: 2,
      boxCount: 4,
    });
    expect(result.reports[1].calculatedVehicleUnits).toBe(113);
    expect(result.reports[1].isValid).toBe(true);
  });

  it("should extract full tables (allTeamRows) in single pass and filter out 伟捷 in code", async () => {
    const result = await extractMultipleTablesFromImage({
      image: "data:image/jpeg;base64,fullTableTwoSheets",
      apiKey: "test-key",
      fullTableGenerator: async () => ({
        object: {
          tables: [
            {
              tableIndex: 1,
              positionDescription: "上半部分第1张表",
              date: "2026.10.28",
              voyage: "绿上海 V6",
              allTeamRows: [
                {
                  rowIndex: 1,
                  rawTeamName: "A同兴",
                  items: [
                    { code: "48FR (3)", type: "框架箱", unitCapacity: 3, boxCount: 5 },
                    { code: "40HQ/40HC (3) 一斜两直", type: "集装箱", unitCapacity: 3, boxCount: 23 },
                  ],
                  totalBoxes: 28,
                  totalVehicleUnits: 84,
                  workerCount: 12,
                  leaderSignature: "彭滔",
                },
                {
                  rowIndex: 2,
                  rawTeamName: "E伟捷",
                  items: [
                    { code: "48FR (3)", type: "框架箱", unitCapacity: 3, boxCount: 5 },
                    { code: "40HQ/40HC (3) 一斜两直", type: "集装箱", unitCapacity: 3, boxCount: 41 },
                  ],
                  totalBoxes: 46,
                  totalVehicleUnits: 138,
                  workerCount: 17,
                  leaderSignature: "郭相帅",
                },
              ],
            },
            {
              tableIndex: 2,
              positionDescription: "下半部分第2张表",
              date: "2026.10.28",
              voyage: "蓝宝石 V6",
              allTeamRows: [
                {
                  rowIndex: 1,
                  rawTeamName: "A同兴",
                  items: [
                    { code: "48FR (3)", type: "框架箱", unitCapacity: 3, boxCount: 30 },
                    { code: "40HQ/40HC (2) 两直装", type: "集装箱", unitCapacity: 2, boxCount: 3 },
                  ],
                  totalBoxes: 33,
                  totalVehicleUnits: 96,
                  workerCount: 12,
                  leaderSignature: "彭滔",
                },
                {
                  rowIndex: 2,
                  rawTeamName: "E伟捷",
                  items: [
                    { code: "48FR (3)", type: "框架箱", unitCapacity: 3, boxCount: 35 },
                    { code: "40HQ/40HC (2) 两直装", type: "集装箱", unitCapacity: 2, boxCount: 4 },
                  ],
                  totalBoxes: 39,
                  totalVehicleUnits: 113,
                  workerCount: 17,
                  leaderSignature: "郭相帅",
                },
              ],
            },
          ],
        },
      }),
    });

    expect(result.tableCount).toBe(2);
    expect(result.reports[0].teamName).toBe("伟捷");
    expect(result.reports[0].voyage).toBe("绿上海 V6");
    expect(result.reports[0].items).toEqual([
      { code: "48FR(3)", type: "框架箱", unitCapacity: 3, boxCount: 5 },
      { code: "40HQ/40HC(3)", type: "集装箱", unitCapacity: 3, boxCount: 41 },
    ]);
    expect(result.reports[0].totalBoxes).toBe(46);
    expect(result.reports[0].totalVehicleUnits).toBe(138);
    expect(result.reports[0].leaderSignature).toBe("郭相帅");

    expect(result.reports[1].teamName).toBe("伟捷");
    expect(result.reports[1].voyage).toBe("蓝宝石 V6");
    expect(result.reports[1].items).toEqual([
      { code: "48FR(3)", type: "框架箱", unitCapacity: 3, boxCount: 35 },
      { code: "40HQ/40HC(2)", type: "集装箱", unitCapacity: 2, boxCount: 4 },
    ]);
    expect(result.reports[1].totalBoxes).toBe(39);
    expect(result.reports[1].totalVehicleUnits).toBe(113);
    expect(result.reports[1].leaderSignature).toBe("郭相帅");
  });

  it("should execute generateText with instructions and file content without throwing InvalidPromptError", async () => {
    const { MockLanguageModelV4 } = await import("ai/test");

    const mockOutput = {
      teamName: "伟捷",
      date: "11月2日",
      voyage: "中远海运欧亚航 V27",
      items: [
        { code: "48FR", type: "框架箱", unitCapacity: 3, boxCount: 28 },
        { code: "40FM", type: "框架箱", unitCapacity: 3, boxCount: 26 },
      ],
      totalBoxes: 54,
      totalVehicleUnits: 162,
      workerCount: 20,
      leaderSignature: "李春河",
    };

    const mockModel = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify(mockOutput) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 10, noCache: 0, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 10, text: 10, reasoning: 0 },
        },
        warnings: [],
      },
    });

    const report = await extractLashingDataFromImage({
      image: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
      apiKey: "sk-real-test-key",
      mockFallback: false,
      generator: async () => {
        const { generateText, Output } = await import("ai");
        const { RawLashingInputSchema } = await import("./types");
        const res = await generateText({
          model: mockModel,
          output: Output.object({ schema: RawLashingInputSchema }),
          instructions: "test instructions",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "extract" },
                { type: "file", data: "data:image/jpeg;base64,/9j/4AAQSkZJRg==", mediaType: "image/jpeg" },
              ],
            },
          ],
        });
        return { object: res.output };
      },
    });

    expect(report.teamName).toBe("伟捷");
    expect(report.items).toHaveLength(2);
    expect(report.calculatedVehicleUnits).toBe(162);
    expect(report.isValid).toBe(true);
  });

  it("should execute reverseVerifyLashingData in fallback and custom generator modes", async () => {
    const fallbackRev = await reverseVerifyLashingImageFallback();
    expect(fallbackRev.status).toBe("passed");
    expect(fallbackRev.isMatched).toBe(true);

    const mismatchRev = await reverseVerifyLashingData({
      image: "data:image/jpeg;base64,custom",
      apiKey: "test-key",
      extractedReport: {
        teamName: "伟捷",
        date: "10月14日",
        voyage: "GREEN KOTKA V18",
        items: [{ code: "48FR(2)", type: "框架箱", unitCapacity: 2, boxCount: 8 }],
        totalBoxes: 8,
        totalVehicleUnits: 16,
        workerCount: 12,
        leaderSignature: "郭相师",
      },
      generator: async () => ({
        object: {
          isMatched: false,
          summary: "手写班组长签字笔画复核为“郭相帅”",
          discrepancies: [
            {
              field: "leaderSignature",
              expectedByFirstPass: "郭相师",
              foundInSecondPass: "郭相帅",
              reason: "末字为帅而非师",
            },
          ],
          correctedData: {
            teamName: "伟捷",
            date: "10月14日",
            voyage: "GREEN KOTKA V18",
            items: [{ code: "48FR(2)", type: "框架箱", unitCapacity: 2, boxCount: 8 }],
            totalBoxes: 8,
            totalVehicleUnits: 16,
            workerCount: 12,
            leaderSignature: "郭相帅",
          },
        },
      }),
    });

    expect(mismatchRev.status).toBe("mismatch");
    expect(mismatchRev.isMatched).toBe(false);
    expect(mismatchRev.discrepancies).toHaveLength(1);
    expect(mismatchRev.correctedData?.leaderSignature).toBe("郭相帅");

    // Test deterministic catch when LLM mistakenly returns isMatched: true despite allRowsAudit showing Row 1 (A同兴) vs Row 2 (E伟捷)
    const rowJumpRev = await reverseVerifyLashingData({
      image: "data:image/jpeg;base64,custom",
      apiKey: "test-key",
      extractedReport: {
        teamName: "伟捷",
        date: "2026.10.28",
        voyage: "绿上海 V6",
        items: [
          { code: "48FR(3)", type: "框架箱", unitCapacity: 3, boxCount: 5 },
          { code: "40HQ/40HC(3)", type: "集装箱", unitCapacity: 3, boxCount: 23 },
        ],
        totalBoxes: 28,
        totalVehicleUnits: 84,
        workerCount: 12,
        leaderSignature: "彭滔",
      },
      generator: async () => ({
        object: {
          allRowsAudit: [
            {
              rowIndex: 1,
              rawTeamName: "A同兴",
              items: [
                { code: "48FR(3)", type: "框架箱", unitCapacity: 3, boxCount: 5 },
                { code: "40HQ/40HC(3)", type: "集装箱", unitCapacity: 3, boxCount: 23 },
              ],
              totalBoxes: 28,
              totalVehicleUnits: 84,
              workerCount: 12,
              leaderSignature: "彭滔",
            },
            {
              rowIndex: 2,
              rawTeamName: "E伟捷",
              items: [
                { code: "48FR(3)", type: "框架箱", unitCapacity: 3, boxCount: 5 },
                { code: "40HQ/40HC(3)", type: "集装箱", unitCapacity: 3, boxCount: 41 },
              ],
              totalBoxes: 46,
              totalVehicleUnits: 138,
              workerCount: 17,
              leaderSignature: "郭相帅",
            },
          ],
          isMatched: true,
          summary: "复核完成",
          discrepancies: [],
          correctedData: null,
        },
      }),
    });

    expect(rowJumpRev.status).toBe("mismatch");
    expect(rowJumpRev.isMatched).toBe(false);
    expect(rowJumpRev.discrepancies.length).toBeGreaterThanOrEqual(3);
    expect(rowJumpRev.correctedData?.totalBoxes).toBe(46);
    expect(rowJumpRev.correctedData?.totalVehicleUnits).toBe(138);
    expect(rowJumpRev.correctedData?.workerCount).toBe(17);
    expect(rowJumpRev.correctedData?.leaderSignature).toBe("郭相帅");
  });
});

async function reverseVerifyLashingImageFallback() {
  return reverseVerifyLashingData({
    image: "data:image/jpeg;base64,dummy",
    mockFallback: true,
    extractedReport: {
      teamName: "伟捷",
      date: "11月2日",
      voyage: "中远海运欧亚航 V27",
      items: [{ code: "48FR(3)", type: "框架箱", unitCapacity: 3, boxCount: 28 }],
      totalBoxes: 28,
      totalVehicleUnits: 84,
      workerCount: 20,
      leaderSignature: "李春河",
    },
  });
}

