"use client";

import { cn } from "@/lib/utils";
import type { CourseStatus } from "@/types/contracts";

type BadgeVariant = CourseStatus | "warning" | "neutral";

const styles: Record<BadgeVariant, string> = {
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
  in_progress: "bg-amber-500/15 text-amber-200 border-amber-400/40 animate-pulse-glow",
  planned_next: "bg-cyan-500/25 text-cyan-100 border-cyan-400/50 shadow-[var(--glow-cyan)]",
  planned_future: "bg-cyan-500/10 text-cyan-200/80 border-cyan-500/25",
  warning: "bg-red-500/15 text-red-200 border-red-400/40",
  neutral: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const labels: Record<BadgeVariant, string> = {
  completed: "Done",
  in_progress: "In progress",
  planned_next: "Next up",
  planned_future: "Planned",
  warning: "Warning",
  neutral: "Info",
};

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ variant, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[variant],
        className
      )}
    >
      {children ?? labels[variant]}
    </span>
  );
}
