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

/** Spacing between stations on the pipeline strip. */
const STOP_GAP = 64;

/** Each agent is a station on its own coloured line, matching the map. */
const AGENT_LINE_COLOR: Record<AgentId, string> = {
  agent1: "var(--l0)",
  agent2: "var(--l2)",
  agent3: "var(--l3)",
  verifier: "var(--l1)",
  agent4: "var(--l4)",
};

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
      play("handoff");
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

  // Where the marker sits. Falls back to the last finished agent so it does
  // not snap home between a handoff and the next agent starting.
  const markerIndex = useMemo(() => {
    if (activeAgent) return Math.max(0, AGENT_ORDER.indexOf(activeAgent));
    for (let i = events.length - 1; i >= 0; i--) {
      const idx = AGENT_ORDER.indexOf(events[i].agentId);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [activeAgent, events]);

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
        "glass-panel overflow-hidden rounded-2xl border border-cyan-500/20",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800/40"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-100">Agent pipeline</span>
          {isGenerating ? (
            <span className="rounded-full bg-[var(--maroon)] px-2 py-0.5 font-mono-accent text-[12px] font-bold text-white">
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
            className="border-t border-slate-700/50"
          >
            {/*
              The pipeline as a small transit line: five stations, one per
              agent, with an orange marker riding between them. The marker
              animates its x-position, so when the Verifier sends work back to
              the Scheduler it visibly travels backwards.
            */}
            <div className="overflow-x-auto px-4 py-3">
              <div
                className="relative shrink-0"
                style={{ width: AGENT_ORDER.length * STOP_GAP, height: 54 }}
                role="img"
                aria-label={`Agent pipeline: ${
                  activeAgent ? getAgentMeta(activeAgent).label + " running" : "idle"
                }, ${completedAgents.size} of ${AGENT_ORDER.length} complete`}
              >
                {/* The track */}
                <div
                  className="absolute top-[22px] h-[3px] rounded-full bg-[var(--ink)]/15"
                  style={{ left: 16, width: (AGENT_ORDER.length - 1) * STOP_GAP }}
                />
                {/* The travelled part of the track */}
                <div
                  className="absolute top-[22px] h-[3px] rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    left: 16,
                    width: Math.max(0, markerIndex * STOP_GAP),
                    background: activeAgent
                      ? AGENT_LINE_COLOR[activeAgent]
                      : "var(--ink)",
                  }}
                />

                {AGENT_ORDER.map((id, idx) => (
                  <div
                    key={id}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: idx * STOP_GAP }}
                  >
                    <AgentAvatar
                      agentId={id}
                      active={activeAgent === id}
                      completed={completedAgents.has(id)}
                      size="sm"
                    />
                  </div>
                ))}

                {/* The marker, riding the line */}
                {activeAgent ? (
                  <div
                    className="pointer-events-none absolute top-[38px] transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(${markerIndex * STOP_GAP}px)` }}
                    aria-hidden
                  >
                    <span
                      className="block h-3 w-3 rounded-full border-2 border-[var(--ink)]"
                      style={{ background: "var(--orange)", marginLeft: 10 }}
                    />
                  </div>
                ) : null}
              </div>
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
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                        : event.type === "error"
                          ? "border-red-500/40 bg-red-500/10 text-red-100"
                          : "border-slate-700/60 bg-slate-900/50 text-slate-300"
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
