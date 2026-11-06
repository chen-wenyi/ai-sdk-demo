"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { WeijieLashingReport } from "@/lib/lashing/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

export interface WeijieLashingCardProps {
  report: WeijieLashingReport;
  className?: string;
  isVerified?: boolean;
}

export function WeijieLashingCard({
  report,
  className,
  isVerified = false,
}: WeijieLashingCardProps) {
  const {
    teamName,
    date,
    voyage,
    items = [],
    totalBoxes,
    totalVehicleUnits,
    workerCount,
    leaderSignature,
    calculatedVehicleUnits,
    isValid,
    discrepancyMessage,
  } = report;

  return (
    <Card
      data-testid="weijie-lashing-card"
      className={cn(
        "w-full max-w-3xl border border-border/80 bg-card text-card-foreground shadow-sm rounded-xl overflow-hidden my-2",
        className
      )}
    >
      {/* Card Header: Team, Date, Voyage & Verification Badge */}
      <CardHeader className="border-b border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              className="bg-primary text-primary-foreground font-semibold px-2.5 py-0.5 text-xs rounded-md shadow-xs"
            >
              {teamName || "E伟捷"}
            </Badge>
            <span
              data-testid="lashing-header-title"
              className="font-medium text-sm sm:text-base text-foreground tracking-tight flex items-center gap-1.5"
            >
              <Calendar className="size-3.5 text-muted-foreground" />
              <span>{date || "当日"}</span>
              <span className="text-muted-foreground/60">|</span>
              <Ship className="size-3.5 text-muted-foreground" />
              <span>{voyage || "作业航次"}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isVerified ? (
              <Badge
                data-testid="status-badge"
                variant="outline"
                className="border-emerald-600/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-medium text-xs px-2 py-0.5"
              >
                <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                已由人工核实验收
              </Badge>
            ) : isValid ? (
              <Badge
                data-testid="status-badge"
                variant="outline"
                className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium text-xs px-2 py-0.5"
              >
                <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                算力校验通过
              </Badge>
            ) : (
              <Badge
                data-testid="status-badge"
                variant="outline"
                className="border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-medium text-xs px-2 py-0.5"
              >
                <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
                算力存在偏差
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Discrepancy Alert */}
      {!isValid && discrepancyMessage && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{discrepancyMessage}</span>
        </div>
      )}

      {/* Card Content: Transposed Horizontal Table */}
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto">
          <Table data-testid="lashing-table" className="w-full min-w-[420px] text-xs sm:text-sm">
            <TableBody>
              {/* Row 1: 箱型代码 */}
              <TableRow data-testid="row-code" className="border-b border-border/60 hover:bg-muted/30">
                <TableHead className="w-28 min-w-[90px] bg-muted/50 font-semibold text-muted-foreground px-3 py-2.5 text-left border-r border-border/60">
                  箱型代码
                </TableHead>
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <TableCell
                      key={`code-${idx}`}
                      className="px-3 py-2.5 text-center font-mono font-semibold text-foreground whitespace-nowrap border-r last:border-r-0 border-border/40"
                    >
                      {item.code}
                    </TableCell>
                  ))
                ) : (
                  <TableCell className="px-3 py-2.5 text-muted-foreground text-center" colSpan={4}>
                    无有效箱型记录
                  </TableCell>
                )}
              </TableRow>

              {/* Row 2: 箱型 */}
              <TableRow data-testid="row-type" className="border-b border-border/60 hover:bg-muted/30">
                <TableHead className="w-28 min-w-[90px] bg-muted/50 font-semibold text-muted-foreground px-3 py-2.5 text-left border-r border-border/60">
                  箱型
                </TableHead>
                {items.map((item, idx) => (
                  <TableCell
                    key={`type-${idx}`}
                    className="px-3 py-2.5 text-center text-muted-foreground whitespace-nowrap border-r last:border-r-0 border-border/40 text-xs sm:text-sm"
                  >
                    {item.type}
                  </TableCell>
                ))}
              </TableRow>

              {/* Row 3: 对应台数 */}
              <TableRow data-testid="row-capacity" className="border-b border-border/60 hover:bg-muted/30">
                <TableHead className="w-28 min-w-[90px] bg-muted/50 font-semibold text-muted-foreground px-3 py-2.5 text-left border-r border-border/60">
                  对应台数
                </TableHead>
                {items.map((item, idx) => (
                  <TableCell
                    key={`cap-${idx}`}
                    className="px-3 py-2.5 text-center font-mono text-foreground whitespace-nowrap border-r last:border-r-0 border-border/40"
                  >
                    {item.unitCapacity}
                  </TableCell>
                ))}
              </TableRow>

              {/* Row 4: 绑扎箱数 */}
              <TableRow data-testid="row-box-count" className="hover:bg-muted/30">
                <TableHead className="w-28 min-w-[90px] bg-muted/50 font-semibold text-muted-foreground px-3 py-2.5 text-left border-r border-border/60">
                  绑扎箱数
                </TableHead>
                {items.map((item, idx) => (
                  <TableCell
                    key={`count-${idx}`}
                    className="px-3 py-2.5 text-center font-mono font-bold text-foreground whitespace-nowrap border-r last:border-r-0 border-border/40 text-sm"
                  >
                    {item.boxCount}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Card Footer: Summary Metrics and Leader Signature */}
      <CardFooter className="border-t border-border/60 bg-muted/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div data-testid="summary-total-boxes" className="flex items-center gap-1.5">
            <Box className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">合计箱数:</span>
            <span className="font-mono font-bold text-foreground">{totalBoxes}</span>
          </div>

          <div data-testid="summary-total-vehicles" className="flex items-center gap-1.5">
            <Truck className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">绑扎车装台数:</span>
            <span className="font-mono font-bold text-foreground">
              {totalVehicleUnits}
            </span>
            {calculatedVehicleUnits !== totalVehicleUnits && (
              <span className="text-amber-600 dark:text-amber-400 font-mono text-xs">
                (计算值: {calculatedVehicleUnits})
              </span>
            )}
          </div>

          <div data-testid="summary-workers" className="flex items-center gap-1.5">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">各队作业人数:</span>
            <span className="font-mono font-bold text-foreground">{workerCount}</span>
          </div>
        </div>

        <div
          data-testid="summary-signature"
          className="flex items-center gap-1.5 ml-auto border border-border/80 bg-background/80 px-2.5 py-1 rounded-md"
        >
          <PenTool className="size-3 text-muted-foreground" />
          <span className="text-muted-foreground text-xs">队长签名:</span>
          <span className="font-medium text-foreground tracking-wide">
            {leaderSignature || "未签署"}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
