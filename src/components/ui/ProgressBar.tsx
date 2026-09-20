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
  cyan: "from-cyan-600 to-cyan-400 shadow-[var(--glow-cyan)]",
  purple: "from-violet-600 to-fuchsia-400 shadow-[0_0_16px_rgba(167,139,250,0.4)]",
  green: "from-emerald-600 to-emerald-400 shadow-[var(--glow-green)]",
  amber: "from-amber-600 to-amber-400 shadow-[var(--glow-amber)]",
  pink: "from-pink-600 to-rose-400 shadow-[0_0_16px_rgba(244,114,182,0.4)]",
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
