"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, Loader2 } from "lucide-react";
import type {
  AgentEvent,
  ExperiencePackage,
  PlanGraph,
  PresentationSpec,
  RequirementsPackage,
} from "@/types/contracts";
import type { PlanDetail } from "@/types/plan";
import { GraduationProgress } from "@/components/plan/GraduationProgress";
import { SemesterExplorer } from "@/components/plan/SemesterExplorer";
import { PrereqChainView } from "@/components/plan/PrereqChainView";
import { SemesterCourseList, PlanFilters } from "@/components/plan/PlanFilters";
import { WeeklyScheduleView } from "@/components/plan/WeeklyScheduleView";
import { AgentActivityFeed } from "@/components/agents/AgentActivityFeed";
import type { UserPreferences } from "@/types/contracts";
import { Button } from "@/components/ui/Button";
import { DEMO_PLAN_GRAPH, DEMO_PRESENTATION } from "@/lib/demo-plan";
import { useAppSounds } from "@/lib/useAppSounds";
import { useSoundSettings } from "@/components/providers/SoundProvider";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

interface GenerateResult {
  planGraph: PlanGraph;
  presentationSpec: PresentationSpec;
  requirementsPackage?: RequirementsPackage;
  experiencePackage?: ExperiencePackage;
}

async function consumeGenerateStream(
  planId: string,
  onEvent: (event: AgentEvent) => void
): Promise<GenerateResult | null> {
  const res = await fetch(`/api/plan/${planId}/generate`, { method: "POST" });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Generation failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: GenerateResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let eventName = "message";
      let dataLine = "";
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLine = line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        const payload = JSON.parse(dataLine) as unknown;
        if (eventName === "agent-event") onEvent(payload as AgentEvent);
        if (eventName === "complete") {
          result = payload as GenerateResult;
        }
        if (eventName === "error") {
          const msg = (payload as { message?: string }).message ?? "Generation error";
          throw new Error(msg);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return result;
}

export function PlanViewClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const planId = params.id;
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reqPkg, setReqPkg] = useState<RequirementsPackage | null>(null);
  const [expPkg, setExpPkg] = useState<ExperiencePackage | null>(null);
  const [draftPreferences, setDraftPreferences] = useState<UserPreferences | null>(null);
  const [graphSelectedElectives, setGraphSelectedElectives] = useState<string[]>([]);
  const { play } = useAppSounds();
  const { muted: _muted } = useSoundSettings();
  const _reducedMotion = usePrefersReducedMotion();

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plan/${planId}`);
      if (!res.ok) throw new Error("Plan not found");
      const data = await res.json();
      setPlan(data.plan);
      if (data.plan.requirementsPackage) setReqPkg(data.plan.requirementsPackage);
      if (data.plan.experiencePackage) setExpPkg(data.plan.experiencePackage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (plan) setDraftPreferences(plan.preferences);
  }, [plan?.id]);

  const regenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startGenRef = useRef<() => void>(() => {});

  const handlePreferencesChange = useCallback(
    async (next: UserPreferences) => {
      setDraftPreferences(next);
      setPlan((p) => (p ? { ...p, preferences: next } : p));
      if (!plan) return;
      await fetch(`/api/plan/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: next }),
      });
      if (regenTimerRef.current) clearTimeout(regenTimerRef.current);
      regenTimerRef.current = setTimeout(() => {
        startGenRef.current();
      }, 1500);
    },
    [plan, planId]
  );

  const startGeneration = useCallback(async () => {
    setGenerating(true);
    setEvents([]);
    try {
      const result = await consumeGenerateStream(planId, (ev) =>
        setEvents((prev) => [...prev, ev])
      );
      if (result) {
        setPlan((p) =>
          p
            ? {
                ...p,
                status: "ready",
                planGraph: result.planGraph,
                presentationSpec: result.presentationSpec,
                requirementsPackage: result.requirementsPackage ?? null,
                experiencePackage: result.experiencePackage ?? null,
              }
            : p
        );
        if (result.requirementsPackage) setReqPkg(result.requirementsPackage);
        if (result.experiencePackage) setExpPkg(result.experiencePackage);
        play("generationComplete");
      }
      await loadPlan();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      play("warning");
    } finally {
      setGenerating(false);
    }
  }, [planId, loadPlan, play]);

  startGenRef.current = () => void startGeneration();

  useEffect(() => {
    if (searchParams.get("generate") === "1" && plan && plan.status === "draft" && !generating) {
      void startGeneration();
    }
  }, [searchParams, plan, generating, startGeneration]);

  const graph = plan?.planGraph ?? (plan?.status === "draft" ? DEMO_PLAN_GRAPH : null);
  const spec = plan?.presentationSpec ?? DEMO_PRESENTATION;
  const usingDemoPreview = !plan?.planGraph && graph === DEMO_PLAN_GRAPH;
  const preferences = draftPreferences ?? plan?.preferences;

  const persistGraph = async (next: PlanGraph) => {
    setPlan((p) => (p ? { ...p, planGraph: next } : p));
    await fetch(`/api/plan/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planGraph: next }),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-circuit-grid text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-cyan-400" />
        Loading plan…
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-circuit-grid">
        <p className="text-red-300">{error}</p>
        <Link href="/">
          <Button type="button">Back home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-circuit-grid pb-32">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 lg:px-10">
          <div>
            <Link href="/" className="text-xs text-slate-500 hover:text-cyan-400">
              ← All plans
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-slate-50">{plan?.name}</h1>
          </div>
          {plan?.status === "draft" && !generating ? (
            <Button type="button" onClick={() => void startGeneration()}>
              Run agents
            </Button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-6 glow-border-cyan"
        >
          <p className="font-mono-accent text-base font-bold text-[var(--ink-soft)]">
            Semester explorer
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-50">
            {spec.heroMessage}
          </h2>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-sm text-slate-300">
            <GraduationCap className="h-4 w-4 text-[var(--vt-orange)]" />
            Est. graduation:{" "}
            {graph?.estimatedGraduation.label ??
              plan?.planGraph?.estimatedGraduation.label ??
              "TBD"}
          </div>
          {usingDemoPreview ? (
            <p className="mt-3 text-xs text-amber-300/90">
              Previewing demo graph — generate to replace with your personalized plan.
            </p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
        </motion.section>

        {/* 1. Graduation progress — always at the very top */}
        {graph ? <GraduationProgress planGraph={graph} /> : null}

        {/* 2. Agent pipeline — above chart while generating, moves to bottom when done */}
        {generating ? (
          <AgentActivityFeed
            events={events}
            isGenerating={generating}
            className="mt-8"
          />
        ) : null}

        {/* 3. Filters — right below grad progress */}
        {preferences && graph ? (
          <div className="mt-4">
            <PlanFilters
              planGraph={graph}
              preferences={preferences}
              onPreferencesChange={(next) => void handlePreferencesChange(next)}
              onRegenerate={() => void startGeneration()}
              regenerating={generating}
            />
          </div>
        ) : null}

        {/* 4. Semester explorer graph */}
        {graph && preferences ? (
          <SemesterExplorer
            planGraph={graph}
            requirementsPackage={reqPkg}
            experiencePackage={expPkg}
            preferences={preferences}
            onPlanChange={(g) => void persistGraph(g)}
            onSelectionsChange={setGraphSelectedElectives}
          />
        ) : !graph ? (
          <p className="text-center text-slate-500">No plan graph yet.</p>
        ) : null}

        {graph ? <PrereqChainView planGraph={graph} className="mt-8 hidden" /> : null}

        {/* 5. Course lists */}
        {graph ? (
          <SemesterCourseList planGraph={graph} requiredOnly />
        ) : null}

        {graph ? (
          <SemesterCourseList planGraph={graph} optionalOnly />
        ) : null}

        {/* 6. Weekly schedule */}
        {graph ? (
          <WeeklyScheduleView
            planGraph={graph}
            requirementsPackage={reqPkg}
            graphSelectedElectives={graphSelectedElectives}
          />
        ) : null}

        {/* 7. Agent pipeline — at the bottom once generation is done */}
        {!generating && events.length > 0 ? (
          <AgentActivityFeed
            events={events}
            isGenerating={false}
            className="mt-8"
          />
        ) : null}
      </main>
    </div>
  );
}
