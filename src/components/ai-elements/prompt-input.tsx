"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Paperclip,
  ArrowUp,
  X,
  FileImage,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PromptInputAttachment {
  id: string;
  url: string; // base64 or object URL
  name?: string;
  size?: number;
}

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (attachments: PromptInputAttachment[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  isLoading = false,
  placeholder = "输入提示词，或直接粘贴 / 拖拽集装箱绑扎统计表图片...",
  className,
}: PromptInputProps) {
  const [attachments, setAttachments] = useState<PromptInputAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [value]);

  const handleFiles = (files: FileList | File[]) => {
    const validImageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    validImageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        if (url) {
          setAttachments((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              url,
              name: file.name,
              size: file.size,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const hasImage = Array.from(e.clipboardData.files).some((f) =>
        f.type.startsWith("image/")
      );
      if (hasImage) {
        e.preventDefault();
        handleFiles(e.clipboardData.files);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check if composing with IME (e.g. Chinese Pinyin input)
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleSubmit = () => {
    if (disabled || isLoading) return;
    if (!value.trim() && attachments.length === 0) return;

    onSubmit(attachments);
    setAttachments([]);
  };

  const canSubmit = !disabled && !isLoading && (value.trim().length > 0 || attachments.length > 0);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-2xl border border-border/80 bg-background/90 shadow-sm transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10",
        isDragging && "border-primary ring-2 ring-primary/20 bg-primary/5",
        className
      )}
    >
      {/* Dragging Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-background/95 backdrop-blur-xs border-2 border-dashed border-primary text-primary">
          <FileImage className="size-8 animate-bounce mb-1" />
          <p className="text-sm font-medium">释放鼠标以上传绑扎单据图片</p>
        </div>
      )}

      {/* Attachment Preview Strip */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 pb-0 border-b border-border/40">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 p-1.5 pr-2 max-w-[240px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={att.url}
                alt={att.name || "附件图片"}
                className="size-10 rounded object-cover border border-border/60"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">
                  {att.name || "集装箱绑扎统计表.jpg"}
                </p>
                {att.size && (
                  <p className="text-[10px] text-muted-foreground">
                    {(att.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                className="size-5 rounded-full bg-background border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
                title="移除图片"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <div className="px-3 pt-2.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled || isLoading}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 leading-relaxed max-h-[200px]"
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between p-2 pt-1 text-xs">
        <div className="flex items-center gap-1.5">
          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading}
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground text-xs rounded-lg"
          >
            <Paperclip className="size-3.5" />
            <span>添加图片</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">
            Enter 发送，Shift+Enter 换行
          </span>
          <Button
            type="button"
            size="icon-sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "size-8 rounded-lg transition-transform",
              canSubmit ? "bg-primary text-primary-foreground hover:scale-105" : "opacity-40"
            )}
            title="发送 (Enter)"
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
