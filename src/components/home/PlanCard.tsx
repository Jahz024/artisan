"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import type { PlanSummary } from "@/types/plan";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const themeAccent: Record<string, string> = {
  circuit_board: "from-cyan-500/20 to-cyan-900/10 border-cyan-500/30",
  constellation: "from-indigo-500/20 to-purple-900/10 border-indigo-500/30",
  subway_map: "from-amber-500/15 to-orange-900/10 border-amber-500/30",
  mountain_trail: "from-emerald-500/15 to-green-900/10 border-emerald-500/30",
  watercolor_garden: "from-pink-500/15 to-rose-900/10 border-pink-500/30",
  blueprint: "from-blue-500/15 to-slate-900/10 border-blue-500/30",
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
      whileHover={{ y: -4 }}
    >
      <Link href={`/plan/${plan.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xl">
        <Card
          glow="none"
          className={cn(
            "relative overflow-hidden bg-gradient-to-br transition-shadow hover:shadow-[var(--glow-cyan)]",
            accent
          )}
        >
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl" />
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{plan.major}</p>
            </div>
            <Badge variant={statusBadge(plan.status)}>{plan.status}</Badge>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(plan.updatedAt).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1 capitalize">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              {String(plan.theme).replace("_", " ")}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm text-cyan-300">
            Open plan
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
