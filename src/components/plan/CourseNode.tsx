"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import type { PlanNode, PresentationSpec } from "@/types/contracts";
import { Badge } from "@/components/ui/Badge";
import { cn, formatCourseCode } from "@/lib/utils";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";

interface CourseNodeProps {
  node: PlanNode;
  index: number;
  highlighted?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  unconnected?: boolean;
  suggestionHighlight?: boolean;
  showInPort?: boolean;
  showOutPort?: boolean;
  onSelect: (node: PlanNode) => void;
  onHover?: (node: PlanNode | null) => void;
  onRegisterPosition?: (nodeId: string, rect: DOMRect) => void;
  titleOverride?: string;
}

const statusIcon = {
  completed: CheckCircle2,
  in_progress: Loader2,
  planned_next: Sparkles,
  planned_future: Circle,
};

function confidenceGlow(confidence: PlanNode["confidence"], status: PlanNode["status"]) {
  if (status === "completed") return "shadow-sm";
  if (status === "in_progress") return "shadow-sm";
  if (status === "planned_next") return "shadow-sm";
  if (confidence === "high") return "shadow-sm";
  if (confidence === "medium") return "shadow-sm";
  return "opacity-95";
}

export function CourseNode({
  node,
  index,
  highlighted,
  dimmed,
  selected,
  unconnected,
  suggestionHighlight,
  showInPort,
  showOutPort,
  onSelect,
  onHover,
  onRegisterPosition,
  titleOverride,
}: CourseNodeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
    data: { node },
    disabled: node.status === "completed",
  });

  const title =
    titleOverride ??
    DEMO_COURSE_TITLES[node.courseId]?.title ??
    node.courseId.replace("-", " ");

  const Icon = statusIcon[node.status];
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <motion.div
      ref={(el) => {
        setNodeRef(el);
        if (el && onRegisterPosition) {
          onRegisterPosition(node.id, el.getBoundingClientRect());
        }
      }}
      style={style}
      initial={{ opacity: 0, scale: 0.92, x: -8 }}
      animate={{
        opacity: dimmed ? 0.32 : 1,
        scale: highlighted || selected ? 1.03 : 1,
        x: 0,
      }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 280, damping: 24 }}
      className={cn(
        "group relative w-full cursor-grab rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm active:cursor-grabbing",
        unconnected && "border-dashed border-slate-300",
        !unconnected && node.status === "completed" && "cursor-default border-slate-300",
        !unconnected && node.status === "in_progress" && "border-emerald-300",
        !unconnected && node.status === "planned_next" && "border-orange-300",
        !unconnected && node.status === "planned_future" && "border-amber-200",
        confidenceGlow(node.confidence, node.status),
        highlighted && "ring-2 ring-emerald-400/50 shadow-md",
        suggestionHighlight && "ring-2 ring-violet-400/60 shadow-md",
        selected && "ring-2 ring-[var(--vt-orange)]",
        isDragging && "z-50 opacity-80"
      )}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(node)}
      onMouseEnter={() => onHover?.(node)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(node)}
      onBlur={() => onHover?.(null)}
      role="button"
      tabIndex={0}
      aria-label={`${formatCourseCode(node.courseId)}, ${title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(node);
        }
      }}
    >
      {showInPort ? (
        <span
          className={cn(
            "pointer-events-none absolute left-0 top-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-emerald-500",
            highlighted && "scale-125 bg-emerald-400"
          )}
          aria-hidden
        />
      ) : null}
      {showOutPort ? (
        <span
          className={cn(
            "pointer-events-none absolute right-0 top-1/2 z-10 h-2 w-2 translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-emerald-500",
            highlighted && "scale-125 bg-emerald-400"
          )}
          aria-hidden
        />
      ) : null}

      <div className="flex items-start justify-between gap-1 pl-1 pr-1">
        <span className="font-mono-accent text-xs font-semibold text-slate-900">
          {formatCourseCode(node.courseId)}
        </span>
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            node.status === "completed" && "text-emerald-400",
            node.status === "in_progress" && "animate-spin text-amber-400",
            node.status === "planned_next" && "text-[var(--vt-orange)]",
            node.status === "planned_future" && "text-amber-500"
          )}
        />
      </div>
      <p className="mt-1 line-clamp-2 pl-1 pr-1 text-[11px] leading-snug text-slate-600">{title}</p>
      <div className="mt-2 flex items-center justify-between gap-1 pl-1 pr-1">
        <Badge variant={node.status} className="!text-[9px]" />
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono-accent text-[10px] text-slate-700">
          {node.score}
        </span>
      </div>
      {node.warnings.length > 0 ? (
        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm"
          title={node.warnings[0]}
        >
          <AlertTriangle className="h-3 w-3" />
        </span>
      ) : null}

      <div className="pointer-events-none absolute -bottom-10 left-1/2 z-20 hidden w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 text-[10px] text-slate-600 shadow-lg group-hover:block group-focus-within:block">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="mt-1 text-slate-500">
          {node.instructor ? `Prof. ${node.instructor}` : "Instructor TBD"}
        </p>
      </div>
    </motion.div>
  );
}

export function getNodeAnnotation(
  spec: PresentationSpec | null | undefined,
  nodeId: string
): string | undefined {
  return spec?.nodeAnnotations.find((a) => a.nodeId === nodeId)?.text;
}
