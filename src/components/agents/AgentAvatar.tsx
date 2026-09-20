"use client";

import { motion } from "framer-motion";
import { Check, Layout, Palette, Search, Shield, Star } from "lucide-react";
import type { AgentId } from "@/types/contracts";
import { cn } from "@/lib/utils";

const AGENT_META: Record<
  AgentId,
  { label: string; color: string; glow: string; Icon: typeof Search }
> = {
  agent1: {
    label: "Requirements",
    color: "text-blue-300",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.5)]",
    Icon: Search,
  },
  agent2: {
    label: "Experience",
    color: "text-purple-300",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.5)]",
    Icon: Star,
  },
  agent3: {
    label: "Scheduler",
    color: "text-emerald-300",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.45)]",
    Icon: Layout,
  },
  agent4: {
    label: "Presentation",
    color: "text-pink-300",
    glow: "shadow-[0_0_20px_rgba(244,114,182,0.45)]",
    Icon: Palette,
  },
  verifier: {
    label: "Verifier",
    color: "text-amber-300",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.45)]",
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
        "relative flex items-center justify-center rounded-xl border border-slate-600/50 bg-slate-900/80",
        dim,
        active && meta.glow,
        active && "animate-pulse-glow border-cyan-400/40"
      )}
      animate={active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ repeat: active ? Infinity : 0, duration: 2 }}
    >
      <meta.Icon className={cn(meta.color)} size={iconSize} aria-hidden />
      {completed ? (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-slate-900"
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
