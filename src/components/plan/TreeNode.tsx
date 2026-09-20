"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { PlanNode } from "@/types/contracts";
import { cn, formatCourseCode } from "@/lib/utils";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";
import {
  nodeFillForStatus,
  nodeStrokeForStatus,
  nodeStrokeWidthForStatus,
  TREE_LAYOUT,
} from "@/components/plan/tree-layout";

interface TreeNodeProps {
  node: PlanNode;
  x: number;
  y: number;
  index: number;
  highlighted?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  suggestionHighlight?: boolean;
  flashError?: boolean;
  onSelect: (node: PlanNode) => void;
  onHover: (node: PlanNode | null) => void;
  verifierWarnings?: string[];
}

export function TreeNode({
  node,
  x,
  y,
  index,
  highlighted,
  dimmed,
  selected,
  suggestionHighlight,
  flashError,
  onSelect,
  onHover,
  verifierWarnings = [],
}: TreeNodeProps) {
  const [localHover, setLocalHover] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
    data: { node },
    disabled: node.status === "completed",
  });

  const radius = TREE_LAYOUT.nodeRadius;
  const diameter = radius * 2;
  const tx = transform?.x ?? 0;
  const ty = transform?.y ?? 0;

  const title =
    DEMO_COURSE_TITLES[node.courseId]?.title ?? node.courseId.replace(/-/g, " ");
  const credits = DEMO_COURSE_TITLES[node.courseId]?.credits ?? 3;

  const showWarningBadge = node.warnings.length > 0 || verifierWarnings.length > 0;

  const handleEnter = () => {
    setLocalHover(true);
    onHover(node);
  };

  const handleLeave = () => {
    setLocalHover(false);
    onHover(null);
  };

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{
        opacity: dimmed ? 0.35 : isDragging ? 0.5 : 1,
        scale: highlighted || selected ? 1.08 : 1,
      }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "absolute z-10 flex items-center gap-2",
        node.status !== "completed" && "cursor-grab active:cursor-grabbing",
        node.status === "completed" && "cursor-pointer",
        isDragging && "z-50"
      )}
      style={{
        left: x - radius + tx,
        top: y - radius + ty,
      }}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(node)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      role="button"
      tabIndex={0}
      aria-label={formatCourseCode(node.courseId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(node);
        }
      }}
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full transition-shadow duration-200",
          node.status === "in_progress" && "animate-tree-node-live",
          selected && "ring-[3px] ring-[var(--orange)] ring-offset-2 ring-offset-[var(--paper-raised)]",
          suggestionHighlight && "ring-2 ring-[var(--line-blue)] ring-offset-2 ring-offset-[var(--paper-raised)]",
          flashError && "ring-[3px] ring-[var(--danger)] ring-offset-2 ring-offset-[var(--paper-raised)]"
        )}
        style={{
          width: diameter,
          height: diameter,
          background: nodeFillForStatus(node.status),
          border: `${nodeStrokeWidthForStatus(node.status)}px ${
            node.confidence === "low" ? "dashed" : "solid"
          } ${nodeStrokeForStatus(node.status)}`,
        }}
      >
        {showWarningBadge ? (
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--paper-raised)] bg-[var(--danger)] text-white">
            <AlertTriangle className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </span>

      {/* Station name, set like a map label */}
      <div className="flex min-w-0 flex-col rounded bg-[var(--paper-raised)]/85 px-1 py-0.5">
        <span
          className={cn(
            "whitespace-nowrap font-mono-accent text-[15px] font-bold leading-none text-[var(--ink)]",
            node.status === "completed" && "text-[var(--ink-soft)]",
            dimmed && "opacity-60"
          )}
        >
          {formatCourseCode(node.courseId)}
          <span className="ml-1.5 text-[11px] font-semibold text-[var(--ink-soft)]">
            {credits} cr
          </span>
        </span>
        {localHover || selected ? (
          <span className="mt-1 max-w-[150px] truncate text-[11px] leading-tight text-[var(--ink-soft)]">
            {title}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}
