"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import type { PlanSummary } from "@/types/plan";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const themeAccent: Record<string, string> = {
  circuit_board: "border-l-4 border-l-slate-400",
  constellation: "border-l-4 border-l-indigo-400",
  subway_map: "border-l-4 border-l-[var(--vt-orange)]",
  mountain_trail: "border-l-4 border-l-emerald-500",
  watercolor_garden: "border-l-4 border-l-pink-400",
  blueprint: "border-l-4 border-l-blue-500",
};

function statusBadge(status: PlanSummary["status"]) {
  if (status === "ready") return "completed" as const;
  if (status === "generating") return "in_progress" as const;
  if (status === "error") return "warning" as const;
  return "planned_future" as const;
}

interface PlanCardProps {
  plan: PlanSummary;
  index: number;
}

export function PlanCard({ plan, index }: PlanCardProps) {
  const accent = themeAccent[plan.theme] ?? themeAccent.circuit_board;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -2 }}
    >
      <Link
        href={`/plan/${plan.id}`}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vt-maroon)]/40"
      >
        <Card
          glow="none"
          className={cn(
            "relative overflow-hidden transition-shadow hover:shadow-md",
            accent
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{plan.major}</p>
            </div>
            <Badge variant={statusBadge(plan.status)}>{plan.status}</Badge>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(plan.updatedAt).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1 capitalize">
              <Sparkles className="h-3.5 w-3.5 text-[var(--vt-orange)]" />
              {String(plan.theme).replace("_", " ")}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--vt-maroon)]">
            Open plan
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
