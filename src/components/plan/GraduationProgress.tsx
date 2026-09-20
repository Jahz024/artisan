"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { PlanGraph } from "@/types/contracts";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  GRADUATION_CREDITS,
  computeGraduationBreakdown,
} from "@/lib/plan-credits";

export interface GraduationProgressProps {
  planGraph: PlanGraph;
  totalRequired?: number;
}

const SEGMENTS = [
  { key: "completed" as const, label: "Completed", className: "bg-emerald-500" },
  { key: "inProgress" as const, label: "In progress", className: "bg-amber-400" },
  { key: "planned" as const, label: "Planned", className: "bg-[var(--vt-orange)]" },
  { key: "remaining" as const, label: "Remaining", className: "bg-slate-200" },
];

export function GraduationProgress({
  planGraph,
  totalRequired = GRADUATION_CREDITS,
}: GraduationProgressProps) {
  const breakdown = useMemo(
    () => computeGraduationBreakdown(planGraph, totalRequired),
    [planGraph, totalRequired]
  );

  const segmentWidths = useMemo(() => {
    const total = totalRequired;
    return {
      completed: (breakdown.completed / total) * 100,
      inProgress: (breakdown.inProgress / total) * 100,
      planned: (breakdown.planned / total) * 100,
      remaining: (breakdown.remaining / total) * 100,
    };
  }, [breakdown, totalRequired]);

  const showWarning = breakdown.totalAccounted > totalRequired;

  return (
    <Card glow="maroon" className="mb-8 border border-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--vt-maroon)]">
            Graduation progress
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Total credits required:{" "}
            <span className="font-medium text-slate-900">{totalRequired}</span> (CS degree)
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums text-slate-900">
            {breakdown.percent}%
          </p>
          <p className="text-sm text-slate-600 tabular-nums">
            {breakdown.totalAccounted}/{totalRequired} credits
          </p>
        </div>
      </div>

      <div
        className="mt-5 flex h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100"
        role="img"
        aria-label={`Graduation progress ${breakdown.percent} percent`}
      >
        {SEGMENTS.map((seg) => {
          const width = segmentWidths[seg.key];
          if (width <= 0) return null;
          return (
            <div
              key={seg.key}
              className={cn("h-full min-w-0 transition-all duration-500", seg.className)}
              style={{ width: `${width}%` }}
              title={`${seg.label}: ${breakdown[seg.key === "inProgress" ? "inProgress" : seg.key]} cr`}
            />
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />{" "}
          {breakdown.completed} completed
        </span>
        <span>·</span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 align-middle" />{" "}
          {breakdown.inProgress} in progress
        </span>
        <span>·</span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--vt-orange)] align-middle" />{" "}
          {breakdown.planned} planned
        </span>
        <span>·</span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full bg-slate-300 align-middle" />{" "}
          {breakdown.remaining} remaining
        </span>
      </div>

      <p className="mt-4 text-sm text-slate-700">
        Est. graduation:{" "}
        <span className="font-medium text-[var(--vt-maroon)]">{planGraph.estimatedGraduation.label}</span>
      </p>

      {showWarning ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          Credit totals don&apos;t align with the {totalRequired}-credit requirement — review your plan
          or regenerate after transcript updates.
        </p>
      ) : null}
    </Card>
  );
}
