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

        if (data.mode === "text" && typeof data.text === "string") {
          const durationMs = data.durationMs || clientElapsedMs;
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.text,
            durationMs,
            tokenUsage: data.tokenUsage,
            createdAt: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          return;
        }

        const rawReports: WeijieLashingReport[] =
          Array.isArray(data.reports) && data.reports.length > 0
            ? data.reports
            : [data.report || data];

        const totalDurationMs = data.durationMs || clientElapsedMs;
        const assistantMsgId = `assistant-${Date.now()}`;

        const reportsWithVerifying: WeijieLashingReport[] = rawReports.map(
          (rep, idx) => ({
            ...rep,
            tableIndex: rep.tableIndex ?? idx + 1,
            totalTables: rawReports.length,
            durationMs: rep.durationMs || totalDurationMs,
            reverseVerification: {
              status: "verifying",
              discrepancies: [],
            },
          })
        );

        const allArithmeticValid = reportsWithVerifying.every((r) => r.isValid);
        const tableCountDesc =
          reportsWithVerifying.length > 1
            ? `主模型盘点共识别出 ${reportsWithVerifying.length} 张表格，子模型并发提取`
            : `已成功定位并提取`;

        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: "assistant",
          content: `${tableCountDesc}【伟捷】行绑扎数据（总耗时 ${(
            totalDurationMs / 1000
          ).toFixed(2)}s），算术比对${
            allArithmeticValid ? "全部一致（校验通过）" : "存在偏差，请确认"
          }，正在并行启动大模型二次反向视觉核对：`,
          report: reportsWithVerifying[0],
          reports: reportsWithVerifying,
          durationMs: totalDurationMs,
          tokenUsage: data.tokenUsage || reportsWithVerifying[0]?.tokenUsage,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);

        // Stage 2: Asynchronous Parallel Reverse Verification for each extracted table
        void Promise.all(
          reportsWithVerifying.map(async (targetReport, reportIdx) => {
            try {
              const verifyRes = await fetch("/api/chat", {
                method: "POST",
                headers,
                body: JSON.stringify({
                  mode: "reverse_verify",
                  image: imageAttachment || "",
                  extractedReport: targetReport,
                  apiKey: settings.apiKey || undefined,
                  baseURL: settings.baseURL || undefined,
                  model: settings.model || undefined,
                  mockFallback: settings.mockFallback,
                }),
              });
              const verifyData = await verifyRes.json();
              const rev =
                verifyRes.ok && verifyData.reverseVerification
                  ? verifyData.reverseVerification
                  : {
                      status: "error" as const,
                      summary: verifyData?.error || "二次反向核对未完成",
                      discrepancies: [],
                    };

              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMsgId) return msg;
                  const currentList =
                    msg.reports && msg.reports.length > 0
                      ? [...msg.reports]
                      : msg.report
                      ? [msg.report]
                      : [];
                  if (!currentList[reportIdx]) return msg;

                  currentList[reportIdx] = {
                    ...currentList[reportIdx],
                    reverseVerification: rev,
                  };

                  const anyStillVerifying = currentList.some(
                    (r) => r.reverseVerification?.status === "verifying"
                  );
                  const allPassed = currentList.every(
                    (r) => r.reverseVerification?.status === "passed"
                  );
                  const anyMismatch = currentList.some(
                    (r) => r.reverseVerification?.status === "mismatch"
                  );

                  const statusSummary = anyStillVerifying
                    ? "正在并行启动大模型二次反向视觉核对"
                    : allPassed
                    ? "二次反向核对全部一致（通过）"
                    : anyMismatch
                    ? "二次反向核对发现潜在差异"
                    : "二次反向核对已完成";

                  return {
                    ...msg,
                    content: `${tableCountDesc}【伟捷】行绑扎数据（首轮耗时 ${(
                      totalDurationMs / 1000
                    ).toFixed(2)}s），算术比对${
                      currentList.every((r) => r.isValid) ? "一致" : "存在偏差"
                    }，${statusSummary}：`,
                    report: currentList[0],
                    reports: currentList,
                  };
                })
              );
            } catch {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMsgId) return msg;
                  const currentList =
                    msg.reports && msg.reports.length > 0
                      ? [...msg.reports]
                      : msg.report
                      ? [msg.report]
                      : [];
                  if (!currentList[reportIdx]) return msg;
                  currentList[reportIdx] = {
                    ...currentList[reportIdx],
                    reverseVerification: {
                      status: "error",
                      summary: "二次反向验证网络请求异常",
                      discrepancies: [],
                    },
                  };
                  return {
                    ...msg,
                    report: currentList[0],
                    reports: currentList,
                  };
                })
              );
            }
          })
        );
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
    (
      messageId: string,
      newReport: WeijieLashingReport,
      reportIndex: number = 0
    ) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const nextReports =
              msg.reports && msg.reports.length > 0
                ? [...msg.reports]
                : [newReport];
            nextReports[reportIndex] = newReport;
            return {
              ...msg,
              content: `已成功定位并提取【${newReport.teamName || "伟捷"}】行绑扎数据（已由人工核实验收）：`,
              report: nextReports[0],
              reports: nextReports,
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
