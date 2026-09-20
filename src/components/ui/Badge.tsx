"use client";

import { cn } from "@/lib/utils";
import type { CourseStatus } from "@/types/contracts";

type BadgeVariant = CourseStatus | "warning" | "neutral";

const styles: Record<BadgeVariant, string> = {
  completed: "bg-[var(--ink)] text-[var(--paper-raised)] border-[var(--ink)]",
  in_progress: "bg-[var(--orange)] text-[var(--ink)] border-[var(--ink)]",
  planned_next: "bg-white text-[var(--maroon)] border-[var(--maroon)]",
  planned_future: "bg-white text-[var(--ink)] border-[var(--ink)]/40",
  warning: "bg-[var(--danger)] text-white border-[var(--danger)]",
  neutral: "bg-[var(--paper-sunk)] text-[var(--ink-soft)] border-transparent",
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
        "inline-flex items-center rounded-full border-2 px-2 py-0.5 font-mono-accent text-[12px] font-bold",
        styles[variant],
        className
      )}
    >
      {children ?? labels[variant]}
    </span>
  );
}
