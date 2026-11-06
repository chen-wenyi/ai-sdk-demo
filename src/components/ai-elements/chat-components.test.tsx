import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  ChatMessageList,
  ChatMessage,
} from "./chat-message-list";
import {
  DEFAULT_SETTINGS,
  loadStoredSettings,
} from "./model-selector";
import { WeijieLashingReport } from "@/lib/lashing/types";

describe("Chat Components Integration", () => {
  const benchmarkReport: WeijieLashingReport = {
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
    calculatedVehicleUnits: 162,
    isValid: true,
  };

  it("should render thinking/extracting indicator when in flight", () => {
    const html = renderToString(
      <ChatMessageList messages={[]} isLoading={true} />
    );

    expect(html).toContain("正在多模态定位“E伟捷”绑扎数据并核对一致性...");
    expect(html).toContain('data-testid="chat-thinking-indicator"');
  });

  it("should render both user message with image and assistant with WeijieLashingCard", () => {
    const messages: ChatMessage[] = [
      {
        id: "msg-1",
        role: "user",
        content: "请识别这张绑扎统计表",
        image: "data:image/jpeg;base64,mockImage123",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "已成功定位并提取【E伟捷】行绑扎数据，一致性比对一致：",
        report: benchmarkReport,
      },
    ];

    const html = renderToString(
      <ChatMessageList messages={messages} isLoading={false} />
    );

    // User message
    expect(html).toContain('data-testid="chat-message-user"');
    expect(html).toContain("请识别这张绑扎统计表");
    expect(html).toContain("data:image/jpeg;base64,mockImage123");

    // Assistant message & Card
    expect(html).toContain('data-testid="chat-message-assistant"');
    expect(html).toContain('data-testid="weijie-lashing-card"');
    expect(html).toContain("48FR");
    expect(html).toContain("40FM");
    expect(html).toContain("李春河");
  });

  it("should handle default settings when localStorage is empty", () => {
    const loaded = loadStoredSettings();
    expect(loaded.model).toBe(DEFAULT_SETTINGS.model);
    expect(loaded.mockFallback).toBe(true);
    expect(loaded.baseURL).toBe(DEFAULT_SETTINGS.baseURL);
  });

  it("should render live elapsed timer during extraction", () => {
    const html = renderToString(
      <ChatMessageList
        messages={[]}
        isLoading={true}
        modelName="qwen-vl-ocr"
      />
    );

    expect(html).toContain('data-testid="chat-thinking-indicator"');
    expect(html).toContain('data-testid="live-elapsed-timer"');
    expect(html).toContain("qwen-vl-ocr");
  });

  it("should render duration badge on completed assistant message and card", () => {
    const messages: ChatMessage[] = [
      {
        id: "msg-duration",
        role: "assistant",
        content: "已提取完成：",
        durationMs: 2350,
        report: {
          ...benchmarkReport,
          durationMs: 2350,
        },
      },
    ];

    const html = renderToString(
      <ChatMessageList messages={messages} isLoading={false} />
    );

    expect(html).toContain('data-testid="message-duration"');
    expect(html).toContain('data-testid="duration-badge"');
    expect(html).toContain("2.35s");
  });
});
