"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChatHeader } from "@/components/ai-elements/chat-header";
import {
  ChatMessageList,
  ChatMessage,
} from "@/components/ai-elements/chat-message-list";
import {
  PromptInput,
  PromptInputAttachment,
} from "@/components/ai-elements/prompt-input";
import {
  LashingSettings,
  DEFAULT_SETTINGS,
  loadStoredSettings,
} from "@/components/ai-elements/model-selector";
import { WeijieLashingReport } from "@/lib/lashing/types";
import { StreamLashingEvent } from "@/lib/lashing/extractor";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingStage, setStreamingStage] = useState<string>("");
  const [streamingStageDetail, setStreamingStageDetail] = useState<string>("");
  const [streamingCot, setStreamingCot] = useState<string>("");
  const [settings, setSettings] = useState<LashingSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadStoredSettings());
  }, []);

  const handleSendMessage = useCallback(
    async (attachments: PromptInputAttachment[]) => {
      if (isLoading) return;

      const text = input.trim();
      const imageAttachment = attachments[0]?.url;

      if (!text && !imageAttachment) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content:
          text ||
          "请识别本张《每天各绑扎队作业数量统计表》中“E伟捷”队伍的作业数据并核对一致性。",
        image: imageAttachment,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setStreamingStage("step-1-preprocess");
      setStreamingStageDetail("步骤 1/4：正在解析绑扎统计表图像负载与方向校准...");
      setStreamingCot("");

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "x-stream": "true",
        };
        if (settings.apiKey) {
          headers["x-qwen-api-key"] = settings.apiKey;
        }
        if (settings.baseURL) {
          headers["x-qwen-base-url"] = settings.baseURL;
        }
        if (settings.model) {
          headers["x-qwen-model"] = settings.model;
        }
        headers["x-mock-fallback"] = settings.mockFallback ? "true" : "false";

        const res = await fetch("/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            image: imageAttachment || "",
            prompt: userMessage.content,
            apiKey: settings.apiKey || undefined,
            baseURL: settings.baseURL || undefined,
            model: settings.model || undefined,
            mockFallback: settings.mockFallback,
            stream: true,
          }),
        });

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream") && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let finalReport: WeijieLashingReport | null = null;
          let latestCot = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split("\n\n");
            buffer = blocks.pop() || "";

            for (const block of blocks) {
              const line = block.trim();
              if (!line.startsWith("data:")) continue;
              const jsonStr = line.slice(5).trim();
              if (!jsonStr) continue;

              let event: StreamLashingEvent;
              try {
                event = JSON.parse(jsonStr) as StreamLashingEvent;
              } catch {
                continue;
              }

              if (event.type === "stage") {
                setStreamingStage(event.stage);
                setStreamingStageDetail(event.detail);
              } else if (event.type === "cot_delta") {
                latestCot = event.accumulated;
                setStreamingCot(event.accumulated);
              } else if (event.type === "report") {
                finalReport = event.report;
              } else if (event.type === "error") {
                throw new Error(event.error);
              }
            }
          }

          if (!finalReport) {
            throw new Error("流式识别结束但未收到有效的数据报表，请检查模型配置或重试");
          }

          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `已成功定位并提取【${finalReport.teamName || "E伟捷"}】行绑扎数据，一致性比对${
              finalReport.isValid ? "一致（校验通过）" : "存在偏差，请确认"
            }：`,
            report: finalReport,
            reasoning: finalReport.reasoning || latestCot || undefined,
            createdAt: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || "请求处理失败，请稍后重试");
          }

          const report: WeijieLashingReport = data.report || data;

          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `已成功定位并提取【${report.teamName || "E伟捷"}】行绑扎数据，一致性比对${
              report.isValid ? "一致（校验通过）" : "存在偏差，请确认"
            }：`,
            report,
            reasoning: report.reasoning,
            createdAt: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "请求视觉多模态服务发生未知异常";
        const errorMessage: ChatMessage = {
          id: `assistant-err-${Date.now()}`,
          role: "assistant",
          content: message,
          isError: true,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setStreamingStage("");
        setStreamingStageDetail("");
        setStreamingCot("");
      }
    },
    [input, isLoading, settings]
  );

  const handleUpdateReport = useCallback(
    (messageId: string, newReport: WeijieLashingReport) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              content: `已成功定位并提取【${newReport.teamName || "E伟捷"}】行绑扎数据（已由人工核实验收）：`,
              report: newReport,
            };
          }
          return msg;
        })
      );
    },
    []
  );

  const handleClearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Top Header with Model Selector */}
      <ChatHeader
        settings={settings}
        onSettingsChange={setSettings}
        onClearMessages={handleClearMessages}
        messageCount={messages.length}
      />

      {/* Main Chat Flow with Scrollable Message List */}
      <main className="flex-1 flex flex-col min-h-0 max-w-5xl w-full mx-auto">
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          streamingStage={streamingStage}
          streamingStageDetail={streamingStageDetail}
          streamingCot={streamingCot}
          modelName={settings.model || "Qwen 3 VL"}
          onUpdateReport={handleUpdateReport}
        />

        {/* Bottom Fixed Prompt Input with Attachment Support */}
        <div className="p-4 pt-2 border-t border-border/40 bg-background/90 backdrop-blur-xs">
          <PromptInput
            value={input}
            onChange={setInput}
            onSubmit={handleSendMessage}
            isLoading={isLoading}
          />
          <div className="text-center pt-2 text-[11px] text-muted-foreground/70 flex flex-col items-center gap-0.5">
            <span>💡 拍照提示：尽量让表格铺满镜头并扶正（避免过多桌面阴影）；若数字密集，推荐在顶部切换为 <b>Qwen VL OCR</b> 模型</span>
            <span className="text-[10px] text-muted-foreground/50">港口绑扎智能助手 · 遵循 shadcn AI Elements 交互规范与 Zod 结构化契约</span>
          </div>
        </div>
      </main>
    </div>
  );
}
