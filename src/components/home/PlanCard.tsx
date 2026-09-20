"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { PlanSummary } from "@/types/plan";
import { Badge } from "@/components/ui/Badge";
import { LINE_PALETTE } from "@/components/plan/tree-layout";

function statusBadge(status: PlanSummary["status"]) {
  if (status === "ready") return "completed" as const;
  if (status === "generating") return "in_progress" as const;
  if (status === "error") return "warning" as const;
  return "planned_future" as const;
}

const statusLabel: Record<string, string> = {
  ready: "Ready",
  generating: "Generating",
  error: "Needs attention",
};

/** A tiny route strip so each saved plan reads like its own line on the map. */
function RouteStrip({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 240 24" className="h-6 w-full" aria-hidden>
      <path d="M 8 12 H 232" stroke={color} strokeWidth={7} strokeLinecap="round" />
      {[8, 64, 120, 176].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={12}
          r={6}
          fill={i < 2 ? "var(--ink)" : "#fff"}
          stroke="var(--ink)"
          strokeWidth={3}
        />
      ))}
      <rect x={220} y={2} width={20} height={20} rx={10} fill="#fff" stroke="var(--ink)" strokeWidth={4} />
    </svg>
  );
}

interface PlanCardProps {
  plan: PlanSummary;
  index: number;
}

export function PlanCard({ plan, index }: PlanCardProps) {
  const color = LINE_PALETTE[index % LINE_PALETTE.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/plan/${plan.id}`}
        className="group block rounded-xl border-2 border-[var(--ink)]/15 bg-[var(--paper-raised)] p-5 transition-colors hover:border-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
      >
        <RouteStrip color={color} />
        <div className="mt-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-bold leading-tight text-[var(--ink)]">
              {plan.name}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{plan.major}</p>
          </div>
          <Badge variant={statusBadge(plan.status)}>
            {statusLabel[plan.status] ?? plan.status}
          </Badge>
        </div>
        <p className="mt-4 text-sm text-[var(--ink-soft)]">
          Updated {new Date(plan.updatedAt).toLocaleDateString()}
        </p>
      </Link>
    </motion.div>
  );
}
