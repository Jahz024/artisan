"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import type { PlanGraph, PlanNode, SemesterGroup } from "@/types/contracts";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { cn, formatCourseCode, termKey } from "@/lib/utils";
import {
  creditsForNode,
  suggestCreditAdjustments,
  sumSemesterCredits,
} from "@/lib/plan-credits";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";

export interface SemesterCreditControlProps {
  semester: SemesterGroup;
  semesterIndex: number;
  planGraph: PlanGraph;
  semesterNodes: PlanNode[];
  targetOverride?: number;
  activeSuggestionIds: Set<string>;
  onApplyTarget: (termKey: string, targetCredits: number, suggestionNodeIds: string[]) => void;
}

export function SemesterCreditControl({
  semester,
  semesterIndex,
  planGraph,
  semesterNodes,
  targetOverride,
  activeSuggestionIds,
  onApplyTarget,
}: SemesterCreditControlProps) {
  const [open, setOpen] = useState(false);
  const [draftTarget, setDraftTarget] = useState(targetOverride ?? semester.totalCredits);
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const [lastSuggestionIds, setLastSuggestionIds] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentCredits = useMemo(
    () => sumSemesterCredits(semesterNodes),
    [semesterNodes]
  );

  const tk = termKey(semester.term);

  useEffect(() => {
    if (targetOverride !== undefined) setDraftTarget(targetOverride);
  }, [targetOverride, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const apply = () => {
    const { nodeIds, summary } = suggestCreditAdjustments(
      planGraph,
      semesterIndex,
      currentCredits,
      draftTarget,
      semesterNodes
    );
    setLastSummary(summary);
    setLastSuggestionIds(nodeIds);
    onApplyTarget(tk, draftTarget, nodeIds);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Adjust credits for ${semester.term.label}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[var(--vt-maroon)]",
          open && "bg-orange-50 text-[var(--vt-orange)]"
        )}
      >
        <Settings2 className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <p className="text-xs font-medium text-slate-800">
            Credits for {semester.term.label}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Current: {currentCredits} cr · Target: {draftTarget} cr
          </p>

          <div className="mt-3">
            <Slider
              label="Target credits"
              value={draftTarget}
              min={3}
              max={19}
              onChange={setDraftTarget}
              hint="VT max is 19 without overload approval"
            />
          </div>

          <Button type="button" className="mt-4 w-full" onClick={apply}>
            Apply
          </Button>

          {lastSummary ? (
            <p className="mt-3 text-xs leading-relaxed text-slate-700">{lastSummary}</p>
          ) : null}

          {lastSuggestionIds.length > 0 ? (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-700">
              {lastSuggestionIds.map((id) => {
                const node = planGraph.nodes.find((n) => n.id === id);
                if (!node) return null;
                const title =
                  DEMO_COURSE_TITLES[node.courseId]?.title ?? formatCourseCode(node.courseId);
                const active = activeSuggestionIds.has(id);
                return (
                  <li
                    key={id}
                    className={cn(
                      "rounded border px-2 py-1",
                      active
                        ? "border-violet-300 bg-violet-50 text-violet-900"
                        : "border-slate-200 bg-slate-50"
                    )}
                  >
                    {formatCourseCode(node.courseId)} · {creditsForNode(node)} cr — {title}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
