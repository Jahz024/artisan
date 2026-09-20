"use client";

import { useCallback, useState } from "react";
import type { AgentEvent, PlanGraph, PresentationSpec } from "@/types/contracts";

interface CompletePayload {
  planGraph: PlanGraph;
  presentationSpec: PresentationSpec;
}

interface ErrorPayload {
  message: string;
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split("\n").filter(Boolean);
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }

  if (!data) return null;
  return { event, data };
}

export function usePlanGeneration(planId: string) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planGraph, setPlanGraph] = useState<PlanGraph | null>(null);
  const [presentationSpec, setPresentationSpec] = useState<PresentationSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startGeneration = useCallback(async () => {
    if (!planId) return;

    setIsGenerating(true);
    setEvents([]);
    setPlanGraph(null);
    setPresentationSpec(null);
    setError(null);

    try {
      const response = await fetch(`/api/plan/${planId}/generate`, { method: "POST" });

      if (!response.ok) {
        let message = `Generation failed (${response.status})`;
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // ignore JSON parse errors
        }
        setError(message);
        setIsGenerating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("Streaming is not supported in this browser");
        setIsGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const parsed = parseSseBlock(block);
          if (!parsed) continue;

          if (parsed.event === "agent-event") {
            const event = JSON.parse(parsed.data) as AgentEvent;
            setEvents((prev) => [...prev, event]);
          } else if (parsed.event === "complete") {
            const payload = JSON.parse(parsed.data) as CompletePayload;
            setPlanGraph(payload.planGraph);
            setPresentationSpec(payload.presentationSpec);
          } else if (parsed.event === "error") {
            const payload = JSON.parse(parsed.data) as ErrorPayload;
            setError(payload.message);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation stream failed");
    } finally {
      setIsGenerating(false);
    }
  }, [planId]);

  return {
    events,
    isGenerating,
    planGraph,
    presentationSpec,
    error,
    startGeneration,
  };
}
