"use client";

import React from "react";
import {
  ModelSelector,
  LashingSettings,
} from "@/components/ai-elements/model-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Anchor, RotateCcw } from "lucide-react";

export interface ChatHeaderProps {
  settings: LashingSettings;
  onSettingsChange: (settings: LashingSettings) => void;
  onClearMessages?: () => void;
  messageCount?: number;
}

export function ChatHeader({
  settings,
  onSettingsChange,
  onClearMessages,
  messageCount = 0,
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-10 w-full border-b border-border/60 bg-background/90 backdrop-blur-md px-4 py-2.5 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Anchor className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                伟捷绑扎作业智能助手
              </h1>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] px-1.5 py-0 border-primary/30 text-primary font-medium"
              >
                E伟捷专属
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              集装箱作业统计表 Qwen 视觉识别与一致性横向校对
            </p>
          </div>
        </div>

        {/* Right Actions: Model Selector & Clear */}
        <div className="flex items-center gap-2">
          {messageCount > 0 && onClearMessages && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearMessages}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="清空当前对话记录"
            >
              <RotateCcw className="size-3.5 sm:mr-1" />
              <span className="hidden sm:inline">清空</span>
            </Button>
          )}

          <ModelSelector
            settings={settings}
            onSettingsChange={onSettingsChange}
          />
        </div>
      </div>
    </header>
  );
}
