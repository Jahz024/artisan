"use client";

import { useCallback, useEffect, useState } from "react";
import type { ArtDirection, PlanGraph, PresentationSpec, UserPreferences } from "@/types/contracts";

export interface PlanSummary {
  id: string;
  name: string;
  major: string;
  status: string;
  theme: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDetail extends PlanSummary {
  userId: string;
  minors: string[];
  catalogYear: string;
  preferences: UserPreferences;
  planGraph: PlanGraph | null;
  presentationSpec: PresentationSpec | null;
  editHistory: unknown[];
}

type StoredPreferences = UserPreferences & {
  completedCourses?: unknown[];
  inProgressCourses?: string[];
};

interface CreatePlanInput {
  name: string;
  major: string;
  minors?: string[];
  catalogYear: string;
  preferences?: StoredPreferences;
}

interface UpdatePlanInput {
  name?: string;
  major?: string;
  minors?: string[];
  catalogYear?: string;
  preferences?: StoredPreferences;
  theme?: ArtDirection;
  planGraph?: PlanGraph;
  presentationSpec?: PresentationSpec;
  status?: "draft" | "generating" | "ready" | "error";
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function usePlans() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/plan");
      if (!response.ok) {
        setError(await readError(response));
        setPlans([]);
        return;
      }
      const body = (await response.json()) as { plans: PlanSummary[] };
      setPlans(body.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { plans, isLoading, error, refresh };
}

export function usePlan(id: string | null) {
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setPlan(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/plan/${id}`);
      if (!response.ok) {
        setError(await readError(response));
        setPlan(null);
        return;
      }
      const body = (await response.json()) as { plan: PlanDetail };
      setPlan(body.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plan");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { plan, isLoading, error, refresh };
}

export function useCreatePlan() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPlan = useCallback(async (input: CreatePlanInput) => {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const message = await readError(response);
        setError(message);
        return null;
      }
      const body = (await response.json()) as { plan: PlanDetail };
      return body.plan;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createPlan, isPending, error };
}

export function useUpdatePlan(planId: string) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePlan = useCallback(
    async (input: UpdatePlanInput) => {
      setIsPending(true);
      setError(null);
      try {
        const response = await fetch(`/api/plan/${planId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          const message = await readError(response);
          setError(message);
          return null;
        }
        const body = (await response.json()) as { plan: PlanDetail };
        return body.plan;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update plan");
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [planId]
  );

  return { updatePlan, isPending, error };
}

export function useDeletePlan() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePlan = useCallback(async (planId: string) => {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/plan/${planId}`, { method: "DELETE" });
      if (!response.ok) {
        const message = await readError(response);
        setError(message);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete plan");
      return false;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { deletePlan, isPending, error };
}
