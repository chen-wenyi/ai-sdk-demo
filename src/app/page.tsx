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

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      const clientStart = Date.now();

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
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
          }),
        });

        const data = await res.json();
        const clientElapsedMs = Math.max(1, Date.now() - clientStart);

        if (!res.ok) {
          throw new Error(data.error || "请求处理失败，请稍后重试");
        }

        const rawReport: WeijieLashingReport = data.report || data;
        const durationMs = rawReport.durationMs || clientElapsedMs;
        const report: WeijieLashingReport = {
          ...rawReport,
          durationMs,
        };

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `已成功定位并提取【${report.teamName || "E伟捷"}】行绑扎数据（耗时 ${(
            durationMs / 1000
          ).toFixed(2)}s），一致性比对${
            report.isValid ? "一致（校验通过）" : "存在偏差，请确认"
          }：`,
          report,
          durationMs,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: unknown) {
        const clientElapsedMs = Math.max(1, Date.now() - clientStart);
        const message =
          err instanceof Error ? err.message : "请求视觉多模态服务发生未知异常";
        const errorMessage: ChatMessage = {
          id: `assistant-err-${Date.now()}`,
          role: "assistant",
          content: message,
          durationMs: clientElapsedMs,
          isError: true,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
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
          <div className="text-center pt-2 text-[11px] text-muted-foreground/70">
            港口绑扎智能助手 · 遵循 shadcn AI Elements 交互规范与 Zod 结构化契约
          </div>
        </div>
      </main>
    </div>
  );
}
