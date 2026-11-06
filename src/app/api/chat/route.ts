import { NextRequest, NextResponse } from "next/server";
import {
  extractImageFromPayload,
  extractLashingDataFromImage,
  DEFAULT_QWEN_BASE_URL,
  DEFAULT_QWEN_MODEL,
} from "@/lib/lashing/extractor";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Weijie Lashing Vision Extractor API",
    defaultModel: DEFAULT_QWEN_MODEL,
    defaultBaseURL: DEFAULT_QWEN_BASE_URL,
  });
}

export async function POST(req: NextRequest) {
  const reqStart = Date.now();
  try {
    const headers = req.headers;
    const authHeader = headers.get("authorization");
    const bearerKey = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;

    const headerApiKey =
      headers.get("x-qwen-api-key") ||
      headers.get("x-api-key") ||
      bearerKey ||
      undefined;

    const headerBaseURL =
      headers.get("x-qwen-base-url") ||
      headers.get("x-base-url") ||
      undefined;

    const headerModel =
      headers.get("x-qwen-model") ||
      headers.get("x-model") ||
      undefined;

    const headerMockFallback =
      headers.get("x-mock-fallback") === "true" || undefined;

    const url = new URL(req.url);
    const queryApiKey = url.searchParams.get("apiKey") || undefined;
    const queryBaseURL = url.searchParams.get("baseURL") || undefined;
    const queryModel = url.searchParams.get("model") || undefined;
    const queryMockFallback =
      url.searchParams.get("mockFallback") === "true" || undefined;

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const apiKey =
      (typeof body.apiKey === "string" ? body.apiKey : undefined) ||
      queryApiKey ||
      headerApiKey;
    const baseURL =
      (typeof body.baseURL === "string" ? body.baseURL : undefined) ||
      queryBaseURL ||
      headerBaseURL ||
      DEFAULT_QWEN_BASE_URL;
    const model =
      (typeof body.model === "string" ? body.model : undefined) ||
      queryModel ||
      headerModel ||
      DEFAULT_QWEN_MODEL;
    const mockFallback =
      typeof body.mockFallback === "boolean"
        ? body.mockFallback
        : queryMockFallback ?? headerMockFallback;

    const image = extractImageFromPayload(body);

    if (!image) {
      return NextResponse.json(
        {
          error:
            "未检测到图片负载，请通过 image、dataUrl 或 messages attachments 传入集装箱绑扎统计表图片。",
        },
        { status: 400 }
      );
    }

    const report = await extractLashingDataFromImage({
      image,
      apiKey,
      baseURL,
      model,
      mockFallback,
    });

    const totalDurationMs = report.durationMs || Math.max(1, Date.now() - reqStart);
    const finalReport = {
      ...report,
      durationMs: totalDurationMs,
    };

    return NextResponse.json(
      {
        ...finalReport,
        report: finalReport,
      },
      {
        status: 200,
        headers: {
          "x-weijie-verified": finalReport.isValid ? "true" : "false",
          "x-duration-ms": String(totalDurationMs),
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "提取或解析绑扎数据时发生错误";
    return NextResponse.json(
      {
        error: errorMessage,
        durationMs: Math.max(1, Date.now() - reqStart),
      },
      { status: 500 }
    );
  }
}
