import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  extractImageFromPayload,
  createQwenClient,
  extractLashingDataFromImage,
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
经过定位分析：
1. 锁定左侧第2行队伍：E伟捷
2. 读取到 48FR 绑扎 28 箱，40FM 绑扎 26 箱。
3. 合计 54 箱，绑扎车装台数 162。

\`\`\`json
{
  "teamName": "E伟捷",
  "date": "11月2日",
  "voyage": "中远海运欧亚航 V27",
  "items": [
    { "code": "48FR", "type": "框架箱", "unitCapacity": "3", "boxCount": "28" },
    { "code": "40FM", "type": "斜架箱/框架", "unitCapacity": "3", "boxCount": "26" }
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
    expect(parsed?.teamName).toBe("E伟捷");
    expect(parsed?.totalBoxes).toBe(54);
    expect(parsed?.totalVehicleUnits).toBe(162);
    expect(parsed?.items[0].boxCount).toBe(28);
    expect(parsed?.items[1].boxCount).toBe(26);
    expect(parsed?.leaderSignature).toBe("李春河");
  });

  it("should parse outer curly braces without markdown code block", () => {
    const textWithBraces = `分析完成：{"teamName":"E伟捷","date":"11月2日","voyage":"测试航次","items":[{"code":"48FR","type":"框架箱","unitCapacity":3,"boxCount":28}],"totalBoxes":28,"totalVehicleUnits":84,"workerCount":10,"leaderSignature":"李春河"} 以上为识别结果。`;
    const parsed = parseLashingJsonFromText(textWithBraces);
    expect(parsed).not.toBeNull();
    expect(parsed?.teamName).toBe("E伟捷");
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

    expect(report.teamName).toBe("E伟捷");
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
      type: "斜架箱/框架",
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
      teamName: "伟捷",
      date: "11月3日",
      voyage: "中远海运星座航 V01",
      items: [
        { code: "48FR", type: "框架箱", unitCapacity: 3, boxCount: 10 },
        { code: "40FM", type: "斜架箱/框架", unitCapacity: 3, boxCount: 20 },
        { code: "20GP", type: "普箱", unitCapacity: 1, boxCount: 0 }, // Should be filtered out
      ],
      totalBoxes: 30,
      totalVehicleUnits: 90, // 10*3 + 20*3 = 90
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

    expect(report.teamName).toBe("E伟捷");
    expect(report.date).toBe("11月3日");
    expect(report.items).toHaveLength(2);
    expect(report.calculatedVehicleUnits).toBe(90);
    expect(report.isValid).toBe(true);
    expect(report.leaderSignature).toBe("张三");
  });

  it("should accurately process the real test fixture image file", async () => {
    const fixturePaths = [
      "/home/antigravity/ca7321cf10ff8408bf7937f243e78cad.jpg",
      path.resolve(__dirname, "../../../tests/fixtures/ca7321cf10ff8408bf7937f243e78cad.jpg"),
    ];

    const fixturePath = fixturePaths.find((p) => fs.existsSync(p));
    expect(fixturePath).toBeDefined();

    const buffer = fs.readFileSync(fixturePath!);
    const base64Data = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    const report = await extractLashingDataFromImage({
      image: base64Data,
      mockFallback: true,
    });

    expect(report.teamName).toBe("E伟捷");
    expect(report.date).toBe("11月2日");
    expect(report.voyage).toBe("中远海运欧亚航 V27");
    expect(report.totalBoxes).toBe(54);
    expect(report.totalVehicleUnits).toBe(162);
    expect(report.workerCount).toBe(20);
    expect(report.leaderSignature).toBe("李春河");
    expect(report.isValid).toBe(true);
  });

  it("should execute generateText with instructions and file content without throwing InvalidPromptError", async () => {
    const { MockLanguageModelV4 } = await import("ai/test");

    const mockOutput = {
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

    expect(report.teamName).toBe("E伟捷");
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
        teamName: "E伟捷",
        date: "10月14日",
        voyage: "GREEN KOTKA V18",
        items: [{ code: "48FR", type: "框架箱", unitCapacity: 2, boxCount: 8 }],
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
            teamName: "E伟捷",
            date: "10月14日",
            voyage: "GREEN KOTKA V18",
            items: [{ code: "48FR", type: "框架箱", unitCapacity: 2, boxCount: 8 }],
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
  });
});

async function reverseVerifyLashingImageFallback() {
  return reverseVerifyLashingData({
    image: "data:image/jpeg;base64,dummy",
    mockFallback: true,
    extractedReport: {
      teamName: "E伟捷",
      date: "11月2日",
      voyage: "中远海运欧亚航 V27",
      items: [{ code: "48FR", type: "框架箱", unitCapacity: 3, boxCount: 28 }],
      totalBoxes: 28,
      totalVehicleUnits: 84,
      workerCount: 20,
      leaderSignature: "李春河",
    },
  });
}

