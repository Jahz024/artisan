"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import type { PlanGraph, PlanNode, PresentationSpec, SemesterGroup } from "@/types/contracts";
import { CourseNode } from "@/components/plan/CourseNode";
import { SemesterCreditControl } from "@/components/plan/SemesterCreditControl";
import { cn, termKey } from "@/lib/utils";

interface SemesterColumnProps {
  semester: SemesterGroup;
  nodes: PlanNode[];
  semesterAnnotation?: PresentationSpec["semesterAnnotations"][number];
  highlightedIds: Set<string>;
  selectedId?: string | null;
  nodesWithIncomingPrereq: Set<string>;
  nodesWithOutgoingPrereq: Set<string>;
  onSelectNode: (node: PlanNode) => void;
  onHoverNode: (node: PlanNode | null) => void;
  onRegisterPosition: (nodeId: string, rect: DOMRect) => void;
  columnIndex: number;
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

export function SemesterColumn({
  semester,
  nodes,
  semesterAnnotation,
  highlightedIds,
  selectedId,
  nodesWithIncomingPrereq,
  nodesWithOutgoingPrereq,
  onSelectNode,
  onHoverNode,
  onRegisterPosition,
  columnIndex,
  semesterIndex,
  planGraph,
  creditTargetOverride,
  creditSuggestionIds,
  onSemesterCreditTarget,
}: SemesterColumnProps) {
  const dropId = termKey(semester.term);
  const { setNodeRef, isOver } = useDroppable({ id: dropId, data: { term: semester.term } });

  const highlightActive = highlightedIds.size > 0;

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: columnIndex * 0.06 }}
      className={cn(
        "relative flex w-[220px] shrink-0 flex-col rounded-xl border border-slate-800 bg-white shadow-sm",
        isOver && "border-[var(--vt-orange)]/50 bg-orange-50/50 shadow-md"
      )}
    >
      <header className="relative border-b border-slate-800 px-3 pb-3 pt-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--vt-maroon)]" />
                <h3 className="text-sm font-semibold leading-tight text-slate-100">
                  {semester.term.label}
                </h3>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono-accent text-[10px] text-slate-300">
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
          </div>
          {semesterAnnotation ? (
            <p className="text-[11px] leading-snug text-cyan-200/75">{semesterAnnotation.text}</p>
          ) : null}
          {semester.warnings.length > 0 ? (
            <div className="flex flex-col gap-1">
              {semester.warnings.map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center gap-1 text-[10px] text-amber-300"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {w}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-2 py-3">
        {nodes.map((node, i) => (
          <CourseNode
            key={node.id}
            node={node}
            index={i}
            onSelect={onSelectNode}
            onHover={onHoverNode}
            onRegisterPosition={onRegisterPosition}
            selected={selectedId === node.id}
            highlighted={highlightedIds.has(node.id)}
            dimmed={highlightActive && !highlightedIds.has(node.id)}
            unconnected={!nodesWithIncomingPrereq.has(node.id)}
            showInPort={nodesWithIncomingPrereq.has(node.id)}
            showOutPort={nodesWithOutgoingPrereq.has(node.id)}
            suggestionHighlight={creditSuggestionIds?.has(node.id)}
          />
        ))}
        {nodes.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">Drop courses here</p>
        ) : null}
      </div>
    </motion.div>
  );
}
