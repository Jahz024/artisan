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

// Solid line colors, matching the transit palette on the plan map.
const colorMap = {
  cyan: "from-[#861F41] to-[#861F41]",
  purple: "from-[#2F5DA8] to-[#2F5DA8]",
  green: "from-[#2E8B57] to-[#2E8B57]",
  amber: "from-[#E5751F] to-[#E5751F]",
  pink: "from-[#127A86] to-[#127A86]",
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
        <div className="flex justify-between text-xs text-slate-400">
          <span>{label}</span>
          <span className="tabular-nums">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-slate-800/90">
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
