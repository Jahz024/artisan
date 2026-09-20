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
          highlighted && "shadow-[0_0_16px_rgba(16,185,129,0.55)]",
          selected && "ring-[3px] ring-[#FF6600] shadow-[0_0_18px_rgba(255,102,0,0.55)]",
          suggestionHighlight && "ring-2 ring-violet-400/80 shadow-[0_0_14px_rgba(167,139,250,0.5)]",
          flashError && "ring-[3px] ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.75)]"
        )}
        style={{
          width: diameter,
          height: diameter,
          background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.22), transparent 45%), ${nodeFillForStatus(node.status)}`,
          border: `2px solid ${nodeStrokeForStatus(node.status)}`,
        }}
      >
        {showWarningBadge ? (
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-[var(--glow-red)]">
            <AlertTriangle className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </span>

      <div className="flex min-w-0 flex-col">
        <span
          className={cn(
            "whitespace-nowrap font-mono-accent text-xs font-bold leading-none text-white",
            dimmed && "text-slate-500"
          )}
        >
          {formatCourseCode(node.courseId)}
        </span>
        {localHover ? (
          <span className="mt-0.5 max-w-[140px] truncate text-[10px] leading-tight text-slate-400">
            {title}
          </span>
        ) : null}
      </div>

      <span className="shrink-0 text-[9px] font-medium tabular-nums text-slate-500">
        {credits}cr
      </span>
    </motion.div>
  );
}
