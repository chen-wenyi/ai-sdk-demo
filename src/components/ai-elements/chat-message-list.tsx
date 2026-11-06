"use client";

import React, { useRef, useEffect } from "react";
import { WeijieLashingReport } from "@/lib/lashing/types";
import { WeijieLashingCard } from "@/components/lashing/weijie-lashing-card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  User,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  report?: WeijieLashingReport;
  isError?: boolean;
  createdAt?: Date;
}

export interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  onUpdateReport?: (messageId: string, newReport: WeijieLashingReport) => void;
  className?: string;
}

export function ChatMessageList({
  messages,
  isLoading = false,
  onUpdateReport,
  className,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-5">
        <div className="relative">
          <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <FileSpreadsheet className="size-8" />
          </div>
          <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border-2 border-background">
            <Sparkles className="size-3.5" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            港口绑扎单据多模态结构化助手
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            上传码头《每天各绑扎队作业数量统计表》现场照片，系统将调用 Qwen
            视觉大模型精准锚定<strong className="text-foreground">“E伟捷”</strong>
            队伍作业数据，并在聊天流中自动渲染横向转置表格与一致性核验。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 overflow-y-auto px-4 py-6 space-y-6", className)}>
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <div
            key={message.id}
            data-testid={`chat-message-${message.role}`}
            className={cn(
              "flex gap-3 max-w-4xl mx-auto",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            {/* Assistant Avatar */}
            {!isUser && (
              <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Bot className="size-4" />
              </div>
            )}

            {/* Bubble Content */}
            <div
              className={cn(
                "flex flex-col gap-2 max-w-[90%] sm:max-w-[85%]",
                isUser ? "items-end" : "items-start"
              )}
            >
              {/* Header Label */}
              <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground font-medium">
                <span>{isUser ? "统计员" : "伟捷 AI 助手"}</span>
                {message.createdAt && (
                  <span>
                    {message.createdAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              {/* User Attachment Image Preview */}
              {isUser && message.image && (
                <div className="rounded-xl overflow-hidden border border-border/80 bg-muted/40 p-1 shadow-xs max-w-[280px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={message.image}
                    alt="绑扎单据"
                    className="rounded-lg object-contain max-h-[180px] w-auto"
                  />
                  <div className="px-1.5 py-1 text-[10px] text-muted-foreground truncate">
                    已提交作业单据图片
                  </div>
                </div>
              )}

              {/* Text Content */}
              {message.content && (
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs",
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-muted/50 border border-border/60 text-foreground rounded-tl-xs"
                  )}
                >
                  {message.content}
                </div>
              )}

              {/* Structured Lashing Card (Renders Directly Inside Message Bubble) */}
              {!isUser && message.report && (
                <div className="w-full">
                  <WeijieLashingCard
                    report={message.report}
                    isVerified={message.report.isHumanVerified}
                    onUpdateReport={(updatedReport) => {
                      onUpdateReport?.(message.id, updatedReport);
                    }}
                  />
                </div>
              )}

              {/* Error Callout */}
              {!isUser && message.isError && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs max-w-md">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">识别提取失败</div>
                    <div className="text-[11px] opacity-90 mt-0.5">{message.content}</div>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            {isUser && (
              <div className="size-8 rounded-lg bg-muted text-muted-foreground border border-border/80 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <User className="size-4" />
              </div>
            )}
          </div>
        );
      })}

      {/* In-Flight Thinking / Extracting Indicator */}
      {isLoading && (
        <div
          data-testid="chat-thinking-indicator"
          className="flex gap-3 max-w-4xl mx-auto justify-start"
        >
          <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs mt-0.5 animate-pulse">
            <Bot className="size-4" />
          </div>
          <div className="flex flex-col gap-1.5 items-start">
            <div className="text-[11px] text-muted-foreground font-medium px-1">
              伟捷 AI 助手
            </div>
            <div className="inline-flex items-center gap-2.5 rounded-2xl bg-muted/60 border border-border/60 px-4 py-2.5 text-xs text-muted-foreground shadow-2xs">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span className="font-medium text-foreground">
                正在多模态定位“E伟捷”绑扎数据并核对一致性...
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-primary/30 text-primary">
                Qwen 3 VL
              </Badge>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
