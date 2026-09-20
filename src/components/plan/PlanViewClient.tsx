"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, Loader2 } from "lucide-react";
import type { AgentEvent, PlanGraph, PresentationSpec } from "@/types/contracts";
import type { PlanDetail } from "@/types/plan";
import { GraduationProgress } from "@/components/plan/GraduationProgress";
import { PlanVisualization } from "@/components/plan/PlanVisualization";
import { PlanFilters, SemesterCourseList } from "@/components/plan/PlanFilters";
import { AgentActivityFeed } from "@/components/agents/AgentActivityFeed";
import type { UserPreferences } from "@/types/contracts";
import { Button } from "@/components/ui/Button";
import { DEMO_PLAN_GRAPH, DEMO_PRESENTATION } from "@/lib/demo-plan";
import { useAppSounds } from "@/lib/useAppSounds";

async function consumeGenerateStream(
  planId: string,
  onEvent: (event: AgentEvent) => void
): Promise<{ planGraph: PlanGraph; presentationSpec: PresentationSpec } | null> {
  const res = await fetch(`/api/plan/${planId}/generate`, { method: "POST" });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Generation failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: { planGraph: PlanGraph; presentationSpec: PresentationSpec } | null = null;

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
          result = payload as { planGraph: PlanGraph; presentationSpec: PresentationSpec };
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
  const [creditSuggestionIds, setCreditSuggestionIds] = useState<Set<string>>(new Set());
  const [draftPreferences, setDraftPreferences] = useState<UserPreferences | null>(null);
  const { play } = useAppSounds();

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plan/${planId}`);
      if (!res.ok) throw new Error("Plan not found");
      const data = await res.json();
      setPlan(data.plan);
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
              }
            : p
        );
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

  useEffect(() => {
    if (searchParams.get("generate") === "1" && plan && plan.status === "draft" && !generating) {
      void startGeneration();
    }
  }, [searchParams, plan, generating, startGeneration]);

  const graph = plan?.planGraph ?? (plan?.status === "draft" ? DEMO_PLAN_GRAPH : null);
  const spec = plan?.presentationSpec ?? DEMO_PRESENTATION;
  const usingDemoPreview = !plan?.planGraph && graph === DEMO_PLAN_GRAPH;

  const persistGraph = async (next: PlanGraph) => {
    setPlan((p) => (p ? { ...p, planGraph: next } : p));
    await fetch(`/api/plan/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planGraph: next }),
    });
  };

  const handleSemesterCreditTarget = async (
    tk: string,
    targetCredits: number,
    suggestionNodeIds: string[]
  ) => {
    setCreditSuggestionIds(new Set(suggestionNodeIds));
    if (!plan) return;
    const overrides = {
      ...plan.preferences.semesterCreditOverrides,
      [tk]: targetCredits,
    };
    setPlan((p) =>
      p
        ? {
            ...p,
            preferences: { ...p.preferences, semesterCreditOverrides: overrides },
          }
        : p
    );
    setDraftPreferences((prev) =>
      prev
        ? { ...prev, semesterCreditOverrides: overrides }
        : { ...plan.preferences, semesterCreditOverrides: overrides }
    );
    await fetch(`/api/plan/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: { ...plan.preferences, semesterCreditOverrides: overrides },
      }),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#861F41]" />
        Loading plan…
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <p className="text-red-600">{error}</p>
        <Link href="/">
          <Button type="button">Back home</Button>
        </Link>
      </div>
    );
  }

  const preferences = draftPreferences ?? plan?.preferences;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-xs text-slate-500 hover:text-[#861F41]">
              ← All plans
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{plan?.name}</h1>
          </div>
          {plan?.status === "draft" && !generating ? (
            <Button
              type="button"
              onClick={() => void startGeneration()}
              className="border-[#861F41]/40 bg-[#861F41] text-white hover:bg-[#6d1834]"
            >
              Run agents
            </Button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:mb-8"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#861F41]">
            Your academic path
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{spec.heroMessage}</h2>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
            <GraduationCap className="h-4 w-4 text-[#E87722]" />
            Est. graduation:{" "}
            {graph?.estimatedGraduation.label ??
              plan?.planGraph?.estimatedGraduation.label ??
              "TBD"}
          </div>
          {usingDemoPreview ? (
            <p className="mt-3 text-xs text-amber-700">
              Previewing demo graph — generate to replace with your personalized plan.
            </p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </motion.section>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="order-2 flex w-full shrink-0 flex-col gap-4 lg:order-1 lg:max-h-[calc(100vh-8rem)] lg:w-[380px] lg:overflow-y-auto lg:pr-1">
            {preferences && graph ? (
              <PlanFilters
                planGraph={graph}
                preferences={preferences}
                onPreferencesChange={(next) => void handlePreferencesChange(next)}
                onRegenerate={() => void startGeneration()}
                regenerating={generating}
              />
            ) : null}
            <AgentActivityFeed events={events} isGenerating={generating} />
          </aside>

          <div className="order-1 min-w-0 flex-1 lg:order-2">
            {graph ? <GraduationProgress planGraph={graph} /> : null}

            {graph ? (
              <PlanVisualization
                planGraph={graph}
                presentationSpec={spec}
                onPlanChange={(g) => void persistGraph(g)}
                semesterCreditOverrides={plan?.preferences.semesterCreditOverrides}
                creditSuggestionIds={creditSuggestionIds}
                onSemesterCreditTarget={(tk, target, ids) =>
                  void handleSemesterCreditTarget(tk, target, ids)
                }
              />
            ) : (
              <p className="text-center text-slate-500">No plan graph yet.</p>
            )}

            {graph ? <SemesterCourseList planGraph={graph} /> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
