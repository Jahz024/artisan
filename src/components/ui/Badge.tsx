"use client";

import { cn } from "@/lib/utils";
import type { CourseStatus } from "@/types/contracts";

type BadgeVariant = CourseStatus | "warning" | "neutral";

const styles: Record<BadgeVariant, string> = {
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-emerald-50 text-emerald-700 border-emerald-200",
  planned_next: "bg-orange-50 text-[#C4621A] border-orange-200",
  planned_future: "bg-amber-50 text-amber-800 border-amber-200",
  warning: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-50 text-slate-600 border-slate-200",
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
