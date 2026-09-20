"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { AgentEvent, AgentId } from "@/types/contracts";
import {
  AgentAvatar,
  agentProgressColor,
  getAgentMeta,
} from "@/components/agents/AgentAvatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { useAppSounds } from "@/lib/useAppSounds";

const AGENT_ORDER: AgentId[] = ["agent1", "agent2", "agent3", "verifier", "agent4"];

function TypewriterText({ text }: { text: string }) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    setDisplay("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setDisplay(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 12);
    return () => window.clearInterval(id);
  }, [text]);

  return <span>{display}</span>;
}

interface AgentActivityFeedProps {
  events: AgentEvent[];
  isGenerating?: boolean;
  className?: string;
}

export function AgentActivityFeed({ events, isGenerating, className }: AgentActivityFeedProps) {
  const [expanded, setExpanded] = useState(true);
  const { play } = useAppSounds();
  const [lastHandoff, setLastHandoff] = useState(0);

  useEffect(() => {
    if (isGenerating) setExpanded(true);
  }, [isGenerating]);

  useEffect(() => {
    const handoffs = events.filter((e) => e.type === "handoff").length;
    if (handoffs > lastHandoff) {
      play("agentHandoff");
      setLastHandoff(handoffs);
    }
  }, [events, lastHandoff, play]);

  const progressByAgent = useMemo(() => {
    const map: Partial<Record<AgentId, number>> = {};
    for (const e of events) {
      if (e.progress != null) {
        map[e.agentId] = Math.max(map[e.agentId] ?? 0, e.progress);
      }
      if (e.type === "completed") map[e.agentId] = 100;
    }
    return map;
  }, [events]);

  const activeAgent = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.type === "started" || e.type === "progress") return e.agentId;
    }
    return null;
  }, [events]);

  const completedAgents = useMemo(() => {
    const set = new Set<AgentId>();
    events.forEach((e) => {
      if (e.type === "completed") set.add(e.agentId);
    });
    return set;
  }, [events]);

  return (
    <motion.section
      layout
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[var(--vt-orange)]" />
          <span className="text-sm font-semibold text-slate-900">Agent pipeline</span>
          {isGenerating ? (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--vt-orange)]">
              Live
            </span>
          ) : null}
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200"
          >
            <div className="flex gap-2 overflow-x-auto px-4 py-3">
              {AGENT_ORDER.map((id, idx) => (
                <div key={id} className="flex shrink-0 items-center gap-2">
                  <AgentAvatar
                    agentId={id}
                    active={activeAgent === id}
                    completed={completedAgents.has(id)}
                    size="sm"
                  />
                  {idx < AGENT_ORDER.length - 1 ? (
                    <motion.div
                      className="h-px w-6 bg-gradient-to-r from-slate-300 to-transparent"
                      animate={
                        completedAgents.has(id)
                          ? { opacity: [0.4, 1, 0.4], scaleX: [0.8, 1, 0.8] }
                          : { opacity: 0.3 }
                      }
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="grid gap-2 px-4 pb-3 sm:grid-cols-2 lg:grid-cols-5">
              {AGENT_ORDER.map((id) => (
                <ProgressBar
                  key={id}
                  label={getAgentMeta(id).label}
                  value={progressByAgent[id] ?? 0}
                  color={agentProgressColor(id)}
                />
              ))}
            </div>

            <ul className="max-h-48 space-y-2 overflow-y-auto px-4 pb-4" aria-live="polite">
              <AnimatePresence initial={false}>
                {events.slice(-12).map((event) => (
                  <motion.li
                    key={`${event.timestamp}-${event.message.slice(0, 24)}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs",
                      event.type === "revision"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : event.type === "error"
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className="font-mono-accent text-[10px] text-slate-500">
                      {getAgentMeta(event.agentId).label}
                    </span>
                    <p className="mt-0.5 leading-relaxed">
                      {event.type === "revision" ? "⚡ " : null}
                      <TypewriterText text={event.message} />
                    </p>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
