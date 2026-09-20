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
    color: "text-[#861F41]",
    glow: "",
    Icon: Search,
  },
  agent2: {
    label: "Experience",
    color: "text-[#2F5DA8]",
    glow: "",
    Icon: Star,
  },
  agent3: {
    label: "Scheduler",
    color: "text-[#2E8B57]",
    glow: "",
    Icon: Layout,
  },
  agent4: {
    label: "Presentation",
    color: "text-[#127A86]",
    glow: "",
    Icon: Palette,
  },
  verifier: {
    label: "Verifier",
    color: "text-[#C95F10]",
    glow: "",
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
        "relative flex items-center justify-center rounded-full border-[3px] border-[var(--ink)] bg-white",
        dim,
        active && meta.glow,
        active && "animate-pulse-glow border-[var(--orange)]"
      )}
      animate={active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ repeat: active ? Infinity : 0, duration: 2 }}
    >
      <meta.Icon className={cn(meta.color)} size={iconSize} aria-hidden />
      {completed ? (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--ink)] text-white"
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
