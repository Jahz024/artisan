"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import type { PlanGraph, PlanNode, PresentationSpec, SemesterGroup } from "@/types/contracts";
import { CourseNode } from "@/components/plan/CourseNode";
import { SemesterCreditControl } from "@/components/plan/SemesterCreditControl";
import { cn, termKey } from "@/lib/utils";

interface SemesterRowProps {
  semester: SemesterGroup;
  nodes: PlanNode[];
  semesterAnnotation?: PresentationSpec["semesterAnnotations"][number];
  highlightedIds: Set<string>;
  selectedId?: string | null;
  onSelectNode: (node: PlanNode) => void;
  onRegisterPosition: (nodeId: string, rect: DOMRect) => void;
  rowIndex: number;
  semesterIndex: number;
  planGraph: PlanGraph;
  creditTargetOverride?: number;
  creditSuggestionIds?: Set<string>;
  onSemesterCreditTarget?: (
    termKey: string,
    targetCredits: number,
    suggestionNodeIds: string[]
  ) => void;
}

export function SemesterRow({
  semester,
  nodes,
  semesterAnnotation,
  highlightedIds,
  selectedId,
  onSelectNode,
  onRegisterPosition,
  rowIndex,
  semesterIndex,
  planGraph,
  creditTargetOverride,
  creditSuggestionIds,
  onSemesterCreditTarget,
}: SemesterRowProps) {
  const dropId = termKey(semester.term);
  const { setNodeRef, isOver } = useDroppable({ id: dropId, data: { term: semester.term } });

  const highlightActive = highlightedIds.size > 0;

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rowIndex * 0.08 }}
      className={cn(
        "relative rounded-xl border border-slate-800 bg-white px-4 py-3 shadow-sm",
        isOver && "border-[var(--vt-orange)]/50 bg-orange-50/50 shadow-md"
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[var(--vt-maroon)]" />
          <h3 className="text-sm font-semibold text-slate-100">{semester.term.label}</h3>
        </div>
        <span className="rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs text-slate-300">
          {semester.totalCredits} cr
        </span>
        {onSemesterCreditTarget ? (
          <SemesterCreditControl
            semester={semester}
            semesterIndex={semesterIndex}
            planGraph={planGraph}
            semesterNodes={nodes}
            targetOverride={creditTargetOverride}
            activeSuggestionIds={creditSuggestionIds ?? new Set()}
            onApplyTarget={onSemesterCreditTarget}
          />
        ) : null}
        {semesterAnnotation ? (
          <p className="text-xs text-cyan-200/80">{semesterAnnotation.text}</p>
        ) : null}
        {semester.warnings.map((w) => (
          <span
            key={w}
            className="inline-flex items-center gap-1 text-xs text-amber-300"
          >
            <AlertCircle className="h-3 w-3" />
            {w}
          </span>
        ))}
      </div>

      <div className="relative flex min-h-[88px] flex-wrap items-center gap-4 pl-2">
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        {nodes.map((node, i) => (
          <CourseNode
            key={node.id}
            node={node}
            index={i}
            onSelect={onSelectNode}
            onRegisterPosition={onRegisterPosition}
            selected={selectedId === node.id}
            highlighted={highlightedIds.has(node.id)}
            dimmed={highlightActive && !highlightedIds.has(node.id)}
            suggestionHighlight={creditSuggestionIds?.has(node.id)}
          />
        ))}
        {nodes.length === 0 ? (
          <p className="text-xs text-slate-500">Drop courses here</p>
        ) : null}
      </div>
    </motion.div>
  );
}
