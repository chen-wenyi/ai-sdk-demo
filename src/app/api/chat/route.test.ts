import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { GET, POST } from "./route";

describe("API Route: /api/chat", () => {
  it("GET /api/chat should return service status and default configuration", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.service).toContain("Weijie Lashing Vision Extractor");
    expect(data.defaultModel).toBe("qwen3-vl-plus");
    expect(data.defaultBaseURL).toBe(
      "https://dashscope.aliyuncs.com/compatible-mode/v1"
    );
  });

  it("POST /api/chat should return 400 when image is missing from payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("未检测到图片负载");
  });

  it("POST /api/chat should accept direct image field and return verified report", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mock-fallback": "true",
      },
      body: JSON.stringify({
        image: "data:image/jpeg;base64,sampleDirectData",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-weijie-verified")).toBe("true");

    const data = await res.json();
    expect(data.teamName).toBe("E伟捷");
    expect(data.date).toBe("11月2日");
    expect(data.voyage).toBe("中远海运欧亚航 V27");
    expect(data.items).toHaveLength(2);
    expect(data.items.map((i: { code: string }) => i.code)).toEqual([
      "48FR",
      "40FM",
    ]);
    expect(data.totalBoxes).toBe(54);
    expect(data.totalVehicleUnits).toBe(162);
    expect(data.calculatedVehicleUnits).toBe(162);
    expect(data.workerCount).toBe(20);
    expect(data.leaderSignature).toBe("李春河");
    expect(data.isValid).toBe(true);
  });

  it("POST /api/chat should accept AI SDK format with experimental_attachments and custom headers", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-qwen-api-key": "sk-user-test-key",
        "x-qwen-base-url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "x-qwen-model": "qwen3-vl-plus",
        "x-mock-fallback": "true",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "请识别这张绑扎统计表",
            experimental_attachments: [
              {
                url: "data:image/jpeg;base64,aiSdkAttachmentBase64",
                contentType: "image/jpeg",
              },
            ],
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.teamName).toBe("E伟捷");
    expect(data.isValid).toBe(true);
    expect(data.report).toBeDefined();
    expect(data.report.totalBoxes).toBe(54);
  });

  it("POST /api/chat should process the real port sheet image fixture", async () => {
    const fixturePaths = [
      "/home/antigravity/ca7321cf10ff8408bf7937f243e78cad.jpg",
      path.resolve(
        __dirname,
        "../../../../tests/fixtures/ca7321cf10ff8408bf7937f243e78cad.jpg"
      ),
    ];

    const fixturePath = fixturePaths.find((p) => fs.existsSync(p));
    expect(fixturePath).toBeDefined();

    const buffer = fs.readFileSync(fixturePath!);
    const base64Data = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mock-fallback": "true",
      },
      body: JSON.stringify({
        image: base64Data,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.teamName).toBe("E伟捷");
    expect(data.date).toBe("11月2日");
    expect(data.voyage).toBe("中远海运欧亚航 V27");
    expect(data.totalBoxes).toBe(54);
    expect(data.totalVehicleUnits).toBe(162);
    expect(data.workerCount).toBe(20);
    expect(data.leaderSignature).toBe("李春河");
    expect(data.calculatedVehicleUnits).toBe(162);
    expect(data.isValid).toBe(true);
    expect(data.discrepancyMessage).toBeUndefined();
    expect(typeof data.durationMs).toBe("number");
    expect(data.durationMs).toBeGreaterThan(0);
    expect(res.headers.get("x-duration-ms")).toBeDefined();
  });

  it("POST /api/chat should support plain text prompt input without image to test response speed", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mock-fallback": "true",
      },
      body: JSON.stringify({
        prompt: "测试普通对话速度",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.mode).toBe("text");
    expect(data.text).toContain("测试普通对话速度");
    expect(typeof data.durationMs).toBe("number");
    expect(data.durationMs).toBeGreaterThan(0);
  });
});
