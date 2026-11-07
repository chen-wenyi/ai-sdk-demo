"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings2,
  Cpu,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export interface LashingSettings {
  model: string;
  apiKey: string;
  baseURL: string;
  mockFallback: boolean;
  rawModelMode?: boolean;
}

export const DEFAULT_SETTINGS: LashingSettings = {
  model: "qwen3-vl-plus",
  apiKey: "",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  mockFallback: true,
  rawModelMode: false,
};

const SETTINGS_STORAGE_KEY = "weijie_lashing_settings";

export function loadStoredSettings(): LashingSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      model: typeof parsed.model === "string" ? parsed.model : DEFAULT_SETTINGS.model,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : DEFAULT_SETTINGS.apiKey,
      baseURL: typeof parsed.baseURL === "string" ? parsed.baseURL : DEFAULT_SETTINGS.baseURL,
      mockFallback:
        typeof parsed.mockFallback === "boolean"
          ? parsed.mockFallback
          : DEFAULT_SETTINGS.mockFallback,
      rawModelMode:
        typeof parsed.rawModelMode === "boolean"
          ? parsed.rawModelMode
          : DEFAULT_SETTINGS.rawModelMode,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: LashingSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to localStorage", e);
  }
}

export interface ModelSelectorProps {
  settings: LashingSettings;
  onSettingsChange: (settings: LashingSettings) => void;
}

export function ModelSelector({
  settings,
  onSettingsChange,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LashingSettings>(settings);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings, open]);

  const MODEL_PRESETS = [
    {
      id: "qwen3-vl-plus",
      name: "Qwen 3 VL Plus",
      desc: "阿里云千问新一代视觉大模型（官方推荐基准）",
      badge: "推荐",
    },
    {
      id: "qwen-vl-ocr",
      name: "Qwen VL OCR",
      desc: "专注高精度复杂手写表格与印刷体 OCR 识别",
      badge: "OCR 优化",
    },
    {
      id: "qwen-vl-max",
      name: "Qwen VL Max",
      desc: "千问超大规模旗舰级多模态模型",
      badge: "超强推理",
    },
  ];

  const handleSave = () => {
    saveStoredSettings(draft);
    onSettingsChange(draft);
    setOpen(false);
  };

  const handleReset = () => {
    setDraft(DEFAULT_SETTINGS);
  };

  const handleToggleRawMode = () => {
    const next: LashingSettings = {
      ...settings,
      rawModelMode: !settings.rawModelMode,
    };
    saveStoredSettings(next);
    onSettingsChange(next);
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Quick Toggle for Raw Model Mode right next to Model Selector */}
      <button
        type="button"
        data-testid="toggle-raw-model-mode"
        onClick={handleToggleRawMode}
        title="开启后直接调用大模型并返回原生文本，不加 JSON Schema 约束，也不渲染结构化表格卡片"
        className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
          settings.rawModelMode
            ? "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300"
            : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
      >
        <span
          className={`inline-block size-2 rounded-full ${
            settings.rawModelMode ? "bg-amber-500" : "bg-muted-foreground/40"
          }`}
        />
        <span>纯模型直连</span>
        <span className="text-[10px] opacity-80">
          {settings.rawModelMode ? "ON" : "OFF"}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border-border/80 text-xs font-medium hover:bg-muted/60 transition-colors"
            />
          }
        >
          <Cpu className="size-3.5 text-primary" />
          <span className="font-mono font-medium">{settings.model}</span>
          {settings.apiKey ? (
            <span className="inline-block size-2 rounded-full bg-emerald-500" title="已配置自定义 API Key" />
          ) : (
            <span className="inline-block size-2 rounded-full bg-muted-foreground/40" title="未配置自定义 API Key（使用环境变量/样本回退）" />
          )}
          <Settings2 className="size-3 text-muted-foreground ml-0.5" />
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">视觉模型与接口配置</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  配置 Qwen 视觉多模态模型端点与 API 密钥，所有设置安全保存在浏览器本地。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Model Preset Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>视觉大模型 (Model)</span>
                <span className="text-[11px] text-muted-foreground font-normal">支持直接输入自定义模型</span>
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {MODEL_PRESETS.map((preset) => {
                  const isSelected = draft.model === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, model: preset.id }))}
                      className={`flex items-start justify-between p-2 rounded-lg border text-left text-xs transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <div>
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <span>{preset.name}</span>
                          <code className="text-[10px] text-muted-foreground">({preset.id})</code>
                          {preset.badge && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                              {preset.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{preset.desc}</p>
                      </div>
                      {isSelected && <Check className="size-4 text-primary shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1">
                <Input
                  value={draft.model}
                  onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value.trim() }))}
                  placeholder="或输入其他模型名称，如 qwen-vl-plus-latest"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <KeyRound className="size-3 text-muted-foreground" />
                  DashScope API Key
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">可选（若留空则走服务器配置/模拟回退）</span>
              </label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={draft.apiKey}
                  onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value.trim() }))}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="h-8 pr-8 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>OpenAI 兼容端点 (Base URL)</span>
              </label>
              <Input
                value={draft.baseURL}
                onChange={(e) => setDraft((d) => ({ ...d, baseURL: e.target.value.trim() }))}
                placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Raw Model Mode Toggle */}
            <div className="pt-1 flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
              <div className="space-y-0.5 pr-2">
                <div className="font-medium text-foreground">纯模型直连模式（无 JSON Schema / 原生返回）</div>
                <div className="text-[11px] text-muted-foreground">
                  开启后不传任何 JSON Schema 约束、不渲染表格卡片，直接把你的提示词和图片发给模型并原样展示返回文本（与百炼 Console 一致）。
                </div>
              </div>
              <input
                type="checkbox"
                id="rawModelMode"
                checked={Boolean(draft.rawModelMode)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, rawModelMode: e.target.checked }))
                }
                className="size-4 rounded border-border text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer shrink-0"
              />
            </div>

            {/* Mock Fallback Toggle */}
            <div className="pt-1 flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
              <div className="space-y-0.5 pr-2">
                <div className="font-medium text-foreground">无 Key 时启用港口真实样本回退</div>
                <div className="text-[11px] text-muted-foreground">
                  未配置 Key 或大模型欠费超时时，自动返回真实单据校验基准数据，方便演示与端到端校对。
                </div>
              </div>
              <input
                type="checkbox"
                id="mockFallback"
                checked={draft.mockFallback}
                onChange={(e) => setDraft((d) => ({ ...d, mockFallback: e.target.checked }))}
                className="size-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer shrink-0"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground h-8"
            >
              <RotateCcw className="size-3 mr-1" />
              恢复默认
            </Button>

            <div className="flex items-center gap-2">
              <DialogClose render={<Button variant="outline" size="sm" className="h-8 text-xs" />}>
                取消
              </DialogClose>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSave}
                className="h-8 text-xs font-medium"
              >
                保存配置
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
