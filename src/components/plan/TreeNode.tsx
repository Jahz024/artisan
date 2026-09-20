"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import type { PlanNode } from "@/types/contracts";
import { cn, formatCourseCode } from "@/lib/utils";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";
import {
  nodeFillForStatus,
  nodeStrokeForStatus,
  nodeStrokeWidthForStatus,
  TREE_LAYOUT,
} from "@/components/plan/tree-layout";

/**
 * How this station should render mid-build. Absent means the plan is finished
 * and the station is fully interactive.
 */
export interface TreeNodeBuildPhase {
  /** The Scheduler has applied status fills. Before that, stations are neutral. */
  showStatus: boolean;
  /** Professors has attached ratings. */
  showRating: boolean;
  /** Play the entrance pop once. */
  fresh: boolean;
  /** Slide in from this many px to the left (the Verifier's fix). */
  slideDx: number | null;
  /** The Verifier is complaining about this one. */
  alert: boolean;
}

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
  buildPhase?: TreeNodeBuildPhase;
  rating?: number;
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
  buildPhase,
  rating,
}: TreeNodeProps) {
  const [localHover, setLocalHover] = useState(false);
  const building = Boolean(buildPhase);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
    data: { node },
    // Nothing moves while the agents are still drawing the map.
    disabled: building || node.status === "completed",
  });

  const radius = TREE_LAYOUT.nodeRadius;
  const diameter = radius * 2;
  const tx = transform?.x ?? 0;
  const ty = transform?.y ?? 0;

  const title =
    DEMO_COURSE_TITLES[node.courseId]?.title ?? node.courseId.replace(/-/g, " ");
  const credits = DEMO_COURSE_TITLES[node.courseId]?.credits ?? 3;

  const showWarningBadge =
    !building && (node.warnings.length > 0 || verifierWarnings.length > 0);

  // Before the Scheduler runs, every station is an undecided neutral outline.
  const typed = !buildPhase || buildPhase.showStatus;
  const background = typed ? nodeFillForStatus(node.status) : "var(--paper-raised)";
  const borderColor = typed ? nodeStrokeForStatus(node.status) : "var(--ink-soft)";
  const borderWidth = typed ? nodeStrokeWidthForStatus(node.status) : 2;
  const borderStyle = !typed || node.confidence === "low" ? "dashed" : "solid";

  const handleEnter = () => {
    if (building) return;
    setLocalHover(true);
    onHover(node);
  };

  const handleLeave = () => {
    if (building) return;
    setLocalHover(false);
    onHover(null);
  };

  return (
    <motion.div
      ref={setNodeRef}
      initial={building ? false : { opacity: 0, scale: 0.4 }}
      animate={{
        opacity: dimmed ? 0.35 : isDragging ? 0.5 : 1,
        scale: highlighted || selected ? 1.08 : 1,
      }}
      transition={
        building
          ? { duration: 0 }
          : { delay: index * 0.03, type: "spring", stiffness: 320, damping: 22 }
      }
      className={cn(
        "absolute z-10 flex items-center gap-2",
        !building && node.status !== "completed" && "cursor-grab active:cursor-grabbing",
        !building && node.status === "completed" && "cursor-pointer",
        buildPhase?.slideDx != null && "build-station-slide",
        isDragging && "z-50"
      )}
      style={{
        left: x - radius + tx,
        top: y - radius + ty,
      }}
      {...(building ? {} : listeners)}
      {...(building ? {} : attributes)}
      onClick={() => {
        if (!building) onSelect(node);
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      role="button"
      tabIndex={building ? -1 : 0}
      aria-label={formatCourseCode(node.courseId)}
      onKeyDown={(e) => {
        if (building) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(node);
        }
      }}
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full transition-[background,border-color] duration-500",
          buildPhase?.fresh && "build-station-pop",
          typed && node.status === "in_progress" && "animate-tree-node-live",
          selected && "ring-[3px] ring-[var(--orange)] ring-offset-2 ring-offset-[var(--paper-raised)]",
          suggestionHighlight && "ring-2 ring-[var(--line-blue)] ring-offset-2 ring-offset-[var(--paper-raised)]",
          flashError && "ring-[3px] ring-[var(--danger)] ring-offset-2 ring-offset-[var(--paper-raised)]"
        )}
        style={{
          width: diameter,
          height: diameter,
          background,
          border: `${borderWidth}px ${borderStyle} ${borderColor}`,
        }}
      >
        {/* A passed stop gets a tick punched through it. */}
        {typed && node.status === "completed" ? (
          <Check
            className="h-3 w-3 text-[var(--paper-raised)]"
            strokeWidth={3.5}
            aria-hidden
          />
        ) : null}

        {/* The Verifier's complaint: a ring that breathes plus a "!" badge. */}
        {buildPhase?.alert ? (
          <>
            <span
              className="build-alert-ring pointer-events-none absolute rounded-full border-[3px] border-[var(--danger)]"
              style={{ width: diameter + 14, height: diameter + 14 }}
              aria-hidden
            />
            <span className="absolute -right-3 -top-3 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--danger)] text-[11px] font-extrabold leading-none text-white">
              !
            </span>
          </>
        ) : null}

        {showWarningBadge ? (
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--paper-raised)] bg-[var(--danger)] text-white">
            <AlertTriangle className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </span>

      {/*
        Station name, set like a map label. The opaque chip is the HTML
        equivalent of the preview's paint-order halo: tracks are interrupted
        by the label rather than crossing the text.
      */}
      <div className="flex min-w-0 flex-col rounded bg-[var(--paper-raised)] px-1 py-0.5">
        <span
          className={cn(
            "whitespace-nowrap font-mono-accent text-[15px] font-bold leading-none text-[var(--ink)]",
            typed && node.status === "completed" && "text-[var(--ink-soft)]",
            dimmed && "opacity-60"
          )}
        >
          {formatCourseCode(node.courseId)}
          <span className="ml-1.5 text-[11px] font-semibold text-[var(--ink-soft)]">
            {credits} cr
          </span>
        </span>
        {rating != null && node.status !== "completed" && (!buildPhase || buildPhase.showRating) ? (
          <span
            className={cn(
              "mt-0.5 whitespace-nowrap text-[11px] font-semibold leading-none text-[var(--ink-soft)]",
              buildPhase?.showRating && buildPhase.fresh && "build-station-pop"
            )}
          >
            ★ {rating.toFixed(1)} professor
          </span>
        ) : null}
        {!building && (localHover || selected) ? (
          <span className="mt-1 max-w-[150px] truncate text-[11px] leading-tight text-[var(--ink-soft)]">
            {title}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}
