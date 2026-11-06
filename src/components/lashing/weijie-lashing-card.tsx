"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { WeijieLashingReport, LashingItem, RawLashingInput } from "@/lib/lashing/types";
import { verifyLashingData } from "@/lib/lashing/verification";
import { exportLashingToCsv } from "@/lib/lashing/export";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  CheckCircle2,
  AlertTriangle,
  Ship,
  Calendar,
  PenTool,
  Users,
  Box,
  Truck,
  Pencil,
  Check,
  X,
  Copy,
  Download,
  Trash2,
  Plus,
  RefreshCw,
} from "lucide-react";

export interface WeijieLashingCardProps {
  report: WeijieLashingReport;
  className?: string;
  isVerified?: boolean;
  onUpdateReport?: (newReport: WeijieLashingReport) => void;
}

export function WeijieLashingCard({
  report,
  className,
  isVerified = false,
  onUpdateReport,
}: WeijieLashingCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<RawLashingInput>(() => ({
    teamName: report.teamName,
    date: report.date,
    voyage: report.voyage,
    items: report.items.map((it) => ({ ...it })),
    totalBoxes: report.totalBoxes,
    totalVehicleUnits: report.totalVehicleUnits,
    workerCount: report.workerCount,
    leaderSignature: report.leaderSignature,
    isHumanVerified: report.isHumanVerified ?? isVerified,
  }));

  // Synchronize draft when report changes externally while not editing
  useEffect(() => {
    if (!isEditing) {
      setDraft({
        teamName: report.teamName,
        date: report.date,
        voyage: report.voyage,
        items: report.items.map((it) => ({ ...it })),
        totalBoxes: report.totalBoxes,
        totalVehicleUnits: report.totalVehicleUnits,
        workerCount: report.workerCount,
        leaderSignature: report.leaderSignature,
        isHumanVerified: report.isHumanVerified ?? isVerified,
      });
    }
  }, [report, isVerified, isEditing]);

  // Real-time calculation during edit mode
  const { liveCalculatedVehicleUnits, liveCalculatedBoxes } = useMemo(() => {
    const activeItems = draft.items || [];
    const boxes = activeItems.reduce(
      (sum, item) => sum + (Number(item.boxCount) || 0),
      0
    );
    const vehicleUnits = activeItems.reduce(
      (sum, item) =>
        sum + (Number(item.boxCount) || 0) * (Number(item.unitCapacity) || 0),
      0
    );
    return {
      liveCalculatedVehicleUnits: vehicleUnits,
      liveCalculatedBoxes: boxes,
    };
  }, [draft.items]);

  const isVehicleUnitsConsistent =
    liveCalculatedVehicleUnits === Number(draft.totalVehicleUnits);
  const isBoxesConsistent =
    liveCalculatedBoxes === Number(draft.totalBoxes);
  const isLiveConsistent = isVehicleUnitsConsistent && isBoxesConsistent;

  // Handlers for entering/exiting edit mode
  const handleStartEditing = () => {
    setDraft({
      teamName: report.teamName,
      date: report.date,
      voyage: report.voyage,
      items: report.items.map((it) => ({ ...it })),
      totalBoxes: report.totalBoxes,
      totalVehicleUnits: report.totalVehicleUnits,
      workerCount: report.workerCount,
      leaderSignature: report.leaderSignature,
      isHumanVerified: true,
    });
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setDraft({
      teamName: report.teamName,
      date: report.date,
      voyage: report.voyage,
      items: report.items.map((it) => ({ ...it })),
      totalBoxes: report.totalBoxes,
      totalVehicleUnits: report.totalVehicleUnits,
      workerCount: report.workerCount,
      leaderSignature: report.leaderSignature,
      isHumanVerified: report.isHumanVerified ?? isVerified,
    });
    setIsEditing(false);
  };

  const handleSaveEditing = () => {
    const verified = verifyLashingData({
      ...draft,
      isHumanVerified: true,
    });

    setIsEditing(false);
    onUpdateReport?.(verified);
  };

  // Sync draft totals with live calculated values
  const handleSyncCalculated = () => {
    setDraft((prev) => ({
      ...prev,
      totalBoxes: liveCalculatedBoxes,
      totalVehicleUnits: liveCalculatedVehicleUnits,
    }));
  };

  // Item modification helpers
  const handleUpdateItem = <K extends keyof LashingItem>(
    index: number,
    field: K,
    val: LashingItem[K]
  ) => {
    setDraft((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = {
        ...nextItems[index],
        [field]: val,
      };
      return {
        ...prev,
        items: nextItems,
      };
    });
  };

  const handleAddItem = () => {
    setDraft((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          code: "40FR",
          type: "框架箱",
          unitCapacity: 3,
          boxCount: 0,
        },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  // Copy JSON handler
  const handleCopyJson = async () => {
    try {
      const jsonContent = JSON.stringify(report, null, 2);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonContent);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard api fails
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Export CSV handler
  const handleExportCsv = () => {
    try {
      const csvData = exportLashingToCsv(report);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `绑扎作业核算_${report.teamName || "E伟捷"}_${report.date || "当日"}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export CSV failed", e);
    }
  };

  const currentDisplayReport = isEditing ? draft : report;
  const currentItems = isEditing ? draft.items : report.items;
  const isHumanVerified = report.isHumanVerified || isVerified;

  return (
    <Card
      data-testid="weijie-lashing-card"
      className={cn(
        "w-full max-w-3xl border border-border/80 bg-card text-card-foreground shadow-sm rounded-xl overflow-hidden my-2",
        className
      )}
    >
      {/* Card Header: Metadata & Actions */}
      <CardHeader className="border-b border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Metadata / Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="default"
              className="bg-primary text-primary-foreground font-semibold px-2.5 py-0.5 text-xs rounded-md shadow-xs"
            >
              {currentDisplayReport.teamName || "E伟捷"}
            </Badge>

            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <Input
                  data-testid="input-edit-date"
                  value={draft.date}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, date: e.target.value }))
                  }
                  placeholder="作业日期，如 11月2日"
                  className="h-7 text-xs w-28 bg-background"
                />
                <span className="text-muted-foreground/60">|</span>
                <Input
                  data-testid="input-edit-voyage"
                  value={draft.voyage}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, voyage: e.target.value }))
                  }
                  placeholder="作业航次，如 欧亚航 V27"
                  className="h-7 text-xs w-44 bg-background"
                />
              </div>
            ) : (
              <span
                data-testid="lashing-header-title"
                className="font-medium text-sm sm:text-base text-foreground tracking-tight flex items-center gap-1.5"
              >
                <Calendar className="size-3.5 text-muted-foreground" />
                <span>{report.date || "当日"}</span>
                <span className="text-muted-foreground/60">|</span>
                <Ship className="size-3.5 text-muted-foreground" />
                <span>{report.voyage || "作业航次"}</span>
              </span>
            )}
          </div>

          {/* Right Status Badge & Action Buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Badge
                  variant="outline"
                  className="border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-medium text-xs px-2 py-0.5"
                >
                  <RefreshCw className="size-3 animate-spin mr-1 text-blue-600 dark:text-blue-400" />
                  就地核验编辑中
                </Badge>
                <Button
                  data-testid="btn-cancel-edit"
                  variant="ghost"
                  size="xs"
                  onClick={handleCancelEditing}
                  className="h-7 px-2 text-xs"
                >
                  <X className="size-3 mr-1" />
                  取消
                </Button>
                <Button
                  data-testid="btn-save-edit"
                  variant="default"
                  size="xs"
                  onClick={handleSaveEditing}
                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                >
                  <Check className="size-3 mr-1" />
                  确认保存
                </Button>
              </>
            ) : (
              <>
                {isHumanVerified ? (
                  <Badge
                    data-testid="status-badge"
                    variant="outline"
                    className="border-emerald-600/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-medium text-xs px-2 py-0.5"
                  >
                    <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                    已由人工核实验收
                  </Badge>
                ) : report.isValid ? (
                  <Badge
                    data-testid="status-badge"
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium text-xs px-2 py-0.5"
                  >
                    <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                    算力校验通过
                  </Badge>
                ) : (
                  <Badge
                    data-testid="status-badge"
                    variant="outline"
                    className="border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-medium text-xs px-2 py-0.5"
                  >
                    <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400 mr-1" />
                    算力存在偏差
                  </Badge>
                )}

                <Button
                  data-testid="btn-edit"
                  variant="outline"
                  size="xs"
                  onClick={handleStartEditing}
                  className="h-7 px-2 text-xs"
                >
                  <Pencil className="size-3 mr-1" />
                  编辑修正
                </Button>

                <Button
                  data-testid="btn-copy-json"
                  variant="outline"
                  size="xs"
                  onClick={handleCopyJson}
                  className="h-7 px-2 text-xs"
                >
                  {copied ? (
                    <Check className="size-3 mr-1 text-emerald-600" />
                  ) : (
                    <Copy className="size-3 mr-1" />
                  )}
                  {copied ? "已复制" : "复制 JSON"}
                </Button>

                <Button
                  data-testid="btn-export-csv"
                  variant="outline"
                  size="xs"
                  onClick={handleExportCsv}
                  className="h-7 px-2 text-xs"
                >
                  <Download className="size-3 mr-1" />
                  导出 CSV
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Discrepancy & Live Calculation Alerts */}
      {isEditing ? (
        <div
          data-testid="live-calculation-indicator"
          className={cn(
            "px-4 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-2 transition-colors",
            isLiveConsistent
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
          )}
        >
          <div className="flex items-center gap-1.5">
            {isLiveConsistent ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <span>
              {isLiveConsistent
                ? `实时核算一致：理论折算车装台数与填报总台数均为 ${liveCalculatedVehicleUnits} 台，合计箱数 ${liveCalculatedBoxes} 箱`
                : `实时算力校验存在偏差：实时计算折算台数 (${liveCalculatedVehicleUnits}) 与填报台数 (${draft.totalVehicleUnits}) 差异 ${Math.abs(liveCalculatedVehicleUnits - Number(draft.totalVehicleUnits))} 台${
                    !isBoxesConsistent
                      ? `；计算箱数 (${liveCalculatedBoxes}) 与填报箱数 (${draft.totalBoxes}) 差异 ${Math.abs(liveCalculatedBoxes - Number(draft.totalBoxes))} 箱`
                      : ""
                  }`}
            </span>
          </div>

          {!isLiveConsistent && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              data-testid="btn-sync-calculated"
              onClick={handleSyncCalculated}
              className="h-6 text-[11px] bg-background/80 hover:bg-background border-amber-500/40 text-amber-800 dark:text-amber-200"
            >
              一键同步计算值
            </Button>
          )}
        </div>
      ) : (
        !report.isValid &&
        report.discrepancyMessage && (
          <div
            data-testid="discrepancy-alert"
            className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1.5"
          >
            <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{report.discrepancyMessage}</span>
          </div>
        )
      )}

      {/* Card Content: Transposed Horizontal Table */}
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto">
          <Table
            data-testid="lashing-table"
            className="w-full min-w-[440px] text-xs sm:text-sm"
          >
            <TableBody>
              {/* Optional Header Row for Column Management in Edit Mode */}
              {isEditing && (
                <TableRow className="border-b border-border/40 bg-muted/20">
                  <TableHead className="w-28 min-w-[90px] bg-muted/40 font-semibold text-muted-foreground px-3 py-1.5 text-left border-r border-border/60">
                    箱型增减
                  </TableHead>
                  {currentItems.map((_, idx) => (
                    <TableCell
                      key={`col-action-${idx}`}
                      className="px-2 py-1 text-center border-r last:border-r-0 border-border/40"
                    >
                      <Button
                        type="button"
                        data-testid={`btn-remove-column-${idx}`}
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRemoveItem(idx)}
                        className="h-6 px-1.5 text-[11px] text-destructive hover:bg-destructive/10"
                        title="删除该箱型"
                      >
                        <Trash2 className="size-3 mr-0.5" />
                        删除
                      </Button>
                    </TableCell>
                  ))}
                  <TableCell className="px-2 py-1 text-center">
                    <Button
                      type="button"
                      data-testid="btn-add-column"
                      variant="outline"
                      size="xs"
                      onClick={handleAddItem}
                      className="h-6 px-2 text-[11px] border-dashed text-primary"
                    >
                      <Plus className="size-3 mr-0.5" />
                      添加箱型
                    </Button>
                  </TableCell>
                </TableRow>
              )}

              {/* Row 1: 箱型代码 */}
              <TableRow
                data-testid="row-code"
                className="border-b border-border/60 hover:bg-muted/30"
              >
                <TableHead className="w-28 min-w-[90px] bg-muted/50 font-semibold text-muted-foreground px-3 py-2.5 text-left border-r border-border/60">
                  箱型代码
                </TableHead>
                {currentItems.length > 0 ? (
                  currentItems.map((item, idx) => (
                    <TableCell
                      key={`code-${idx}`}
                      className="px-3 py-2 text-center font-mono font-semibold text-foreground whitespace-nowrap border-r last:border-r-0 border-border/40"
                    >
                      {isEditing ? (
                        <Input
                          data-testid={`input-code-${idx}`}
                          value={item.code}
                          onChange={(e) =>
                            handleUpdateItem(idx, "code", e.target.value)
                          }
                          className="h-7 text-xs font-mono font-semibold text-center w-24 mx-auto bg-background"
                        />
                      ) : (
                        item.code
                      )}
                    </TableCell>
                  ))
                ) : (
                  <TableCell
                    className="px-3 py-2.5 text-muted-foreground text-center"
                    colSpan={4}
                  >
                    无有效箱型记录
                  </TableCell>
                )}
                {isEditing && <TableCell className="border-border/40" />}
              </TableRow>

              {/* Row 2: 箱型 */}
              <TableRow
                data-testid="row-type"
                className="border-b border-border/60 hover:bg-muted/30"
              >
                <TableHead className="w-28 min-w-[90px] bg-muted/50 font-semibold text-muted-foreground px-3 py-2.5 text-left border-r border-border/60">
                  箱型
                </TableHead>
                {currentItems.map((item, idx) => (
                  <TableCell
                    key={`type-${idx}`}
                    className="px-3 py-2 text-center text-muted-foreground whitespace-nowrap border-r last:border-r-0 border-border/40 text-xs sm:text-sm"
                  >
                    {isEditing ? (
                      <Input
                        data-testid={`input-type-${idx}`}
                        value={item.type}
                        onChange={(e) =>
                          handleUpdateItem(idx, "type", e.target.value)
                        }
                        className="h-7 text-xs text-center w-28 mx-auto bg-background"
                      />
                    ) : (
                      item.type
                    )}
                  </TableCell>
                ))}
                {isEditing && <TableCell className="border-border/40" />}
              </TableRow>

              {/* Row 3: 对应台数 */}
              <TableRow
                data-testid="row-capacity"
                className="border-b border-border/60 hover:bg-muted/30"
              >
                <TableHead className="w-28 min-w-[90px] bg-muted/50 font-semibold text-muted-foreground px-3 py-2.5 text-left border-r border-border/60">
                  对应台数
                </TableHead>
                {currentItems.map((item, idx) => (
                  <TableCell
                    key={`cap-${idx}`}
                    className="px-3 py-2 text-center font-mono text-foreground whitespace-nowrap border-r last:border-r-0 border-border/40"
                  >
                    {isEditing ? (
                      <Input
                        data-testid={`input-capacity-${idx}`}
                        type="number"
                        value={item.unitCapacity}
                        onChange={(e) =>
                          handleUpdateItem(
                            idx,
                            "unitCapacity",
                            Number(e.target.value)
                          )
                        }
                        className="h-7 text-xs font-mono text-center w-20 mx-auto bg-background"
                      />
                    ) : (
                      item.unitCapacity
                    )}
                  </TableCell>
                ))}
                {isEditing && <TableCell className="border-border/40" />}
              </TableRow>

              {/* Row 4: 绑扎箱数 */}
              <TableRow
                data-testid="row-box-count"
                className="hover:bg-muted/30"
              >
                <TableHead className="w-28 min-w-[90px] bg-muted/50 font-semibold text-muted-foreground px-3 py-2.5 text-left border-r border-border/60">
                  绑扎箱数
                </TableHead>
                {currentItems.map((item, idx) => (
                  <TableCell
                    key={`count-${idx}`}
                    className="px-3 py-2 text-center font-mono font-bold text-foreground whitespace-nowrap border-r last:border-r-0 border-border/40 text-sm"
                  >
                    {isEditing ? (
                      <Input
                        data-testid={`input-box-count-${idx}`}
                        type="number"
                        value={item.boxCount}
                        onChange={(e) =>
                          handleUpdateItem(
                            idx,
                            "boxCount",
                            Number(e.target.value)
                          )
                        }
                        className="h-7 text-xs font-mono font-bold text-center w-20 mx-auto bg-background"
                      />
                    ) : (
                      item.boxCount
                    )}
                  </TableCell>
                ))}
                {isEditing && <TableCell className="border-border/40" />}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Card Footer: Summary Metrics and Leader Signature */}
      <CardFooter className="border-t border-border/60 bg-muted/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div
            data-testid="summary-total-boxes"
            className="flex items-center gap-1.5"
          >
            <Box className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">合计箱数:</span>
            {isEditing ? (
              <Input
                data-testid="input-total-boxes"
                type="number"
                value={draft.totalBoxes}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    totalBoxes: Number(e.target.value),
                  }))
                }
                className="h-7 text-xs font-mono font-bold w-18 bg-background"
              />
            ) : (
              <span className="font-mono font-bold text-foreground">
                {report.totalBoxes}
              </span>
            )}
          </div>

          <div
            data-testid="summary-total-vehicles"
            className="flex items-center gap-1.5"
          >
            <Truck className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">绑扎车装台数:</span>
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <Input
                  data-testid="input-total-vehicles"
                  type="number"
                  value={draft.totalVehicleUnits}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      totalVehicleUnits: Number(e.target.value),
                    }))
                  }
                  className="h-7 text-xs font-mono font-bold w-18 bg-background"
                />
                <span className="text-muted-foreground text-xs font-mono">
                  (实时计算: {liveCalculatedVehicleUnits})
                </span>
              </div>
            ) : (
              <>
                <span className="font-mono font-bold text-foreground">
                  {report.totalVehicleUnits}
                </span>
                {report.calculatedVehicleUnits !== report.totalVehicleUnits && (
                  <span className="text-amber-600 dark:text-amber-400 font-mono text-xs">
                    (计算值: {report.calculatedVehicleUnits})
                  </span>
                )}
              </>
            )}
          </div>

          <div
            data-testid="summary-workers"
            className="flex items-center gap-1.5"
          >
            <Users className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">各队作业人数:</span>
            {isEditing ? (
              <Input
                data-testid="input-worker-count"
                type="number"
                value={draft.workerCount}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    workerCount: Number(e.target.value),
                  }))
                }
                className="h-7 text-xs font-mono font-bold w-16 bg-background"
              />
            ) : (
              <span className="font-mono font-bold text-foreground">
                {report.workerCount}
              </span>
            )}
          </div>
        </div>

        <div
          data-testid="summary-signature"
          className="flex items-center gap-1.5 ml-auto border border-border/80 bg-background/80 px-2.5 py-1 rounded-md"
        >
          <PenTool className="size-3 text-muted-foreground" />
          <span className="text-muted-foreground text-xs">队长签名:</span>
          {isEditing ? (
            <Input
              data-testid="input-leader-signature"
              value={draft.leaderSignature}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  leaderSignature: e.target.value,
                }))
              }
              placeholder="签名"
              className="h-7 text-xs w-20 bg-background"
            />
          ) : (
            <span className="font-medium text-foreground tracking-wide">
              {report.leaderSignature || "未签署"}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
