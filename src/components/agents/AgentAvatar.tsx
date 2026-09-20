"use client";

import { motion } from "framer-motion";
import { Check, Layout, Palette, Search, Shield, Star } from "lucide-react";
import type { AgentId } from "@/types/contracts";
import { cn } from "@/lib/utils";

const AGENT_META: Record<
  AgentId,
  { label: string; color: string; ring: string; Icon: typeof Search }
> = {
  agent1: {
    label: "Requirements",
    color: "text-blue-600",
    ring: "ring-blue-200",
    Icon: Search,
  },
  agent2: {
    label: "Experience",
    color: "text-purple-600",
    ring: "ring-purple-200",
    Icon: Star,
  },
  agent3: {
    label: "Scheduler",
    color: "text-emerald-600",
    ring: "ring-emerald-200",
    Icon: Layout,
  },
  agent4: {
    label: "Presentation",
    color: "text-pink-600",
    ring: "ring-pink-200",
    Icon: Palette,
  },
  verifier: {
    label: "Verifier",
    color: "text-amber-700",
    ring: "ring-amber-200",
    Icon: Shield,
  },
};

interface AgentAvatarProps {
  agentId: AgentId;
  active?: boolean;
  completed?: boolean;
  size?: "sm" | "md";
}

export function AgentAvatar({ agentId, active, completed, size = "md" }: AgentAvatarProps) {
  const meta = AGENT_META[agentId];
  const dim = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const iconSize = size === "sm" ? 14 : 18;

  return (
    <motion.div
      className={cn(
        "relative flex items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm",
        dim,
        active && cn("ring-2", meta.ring, "border-[var(--vt-maroon)]/30"),
        active && "animate-pulse-glow"
      )}
      animate={active ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ repeat: active ? Infinity : 0, duration: 2 }}
    >
      <meta.Icon className={cn(meta.color)} size={iconSize} aria-hidden />
      {completed ? (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
        >
          <Check size={10} strokeWidth={3} />
        </motion.span>
      ) : null}
    </motion.div>
  );
}

export function getAgentMeta(agentId: AgentId) {
  return AGENT_META[agentId];
}

export function agentProgressColor(agentId: AgentId): "cyan" | "purple" | "green" | "amber" | "pink" {
  const map: Record<AgentId, "cyan" | "purple" | "green" | "amber" | "pink"> = {
    agent1: "cyan",
    agent2: "purple",
    agent3: "green",
    agent4: "pink",
    verifier: "amber",
  };
  return map[agentId];
}
