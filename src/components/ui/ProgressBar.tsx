"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: "cyan" | "purple" | "green" | "amber" | "pink";
  className?: string;
}

const colorMap = {
  cyan: "from-slate-600 to-slate-400",
  purple: "from-violet-600 to-violet-400",
  green: "from-emerald-600 to-emerald-400",
  amber: "from-amber-600 to-amber-400",
  pink: "from-pink-600 to-rose-400",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  color = "cyan",
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("space-y-1", className)}>
      {label ? (
        <div className="flex justify-between text-xs text-slate-600">
          <span>{label}</span>
          <span className="tabular-nums">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", colorMap[color])}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
