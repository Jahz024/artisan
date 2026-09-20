"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Plus, Volume2, VolumeX } from "lucide-react";
import type { Session } from "next-auth";
import type { PlanSummary } from "@/types/plan";
import { CircuitBackground } from "@/components/home/CircuitBackground";
import { PlanCard } from "@/components/home/PlanCard";
import { Button } from "@/components/ui/Button";
import { useSoundSettings } from "@/components/providers/SoundProvider";

interface HomeDashboardProps {
  session: Session | null;
}

export function HomeDashboard({ session: initialSession }: HomeDashboardProps) {
  const { data: clientSession } = useSession();
  const session = clientSession ?? initialSession;
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const { muted, toggleMute } = useSoundSettings();

  useEffect(() => {
    if (!session?.user) return;
    setLoadingPlans(true);
    fetch("/api/plan")
      .then((r) => (r.ok ? r.json() : { plans: [] }))
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, [session?.user]);

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-slate-50">
      <header className="relative z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--vt-maroon)] text-sm font-bold text-white shadow-sm">
            VT
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Hokie <span className="text-[var(--vt-orange)]">Pathfinder</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            type="button"
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            onClick={toggleMute}
            className="!px-2"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          {session?.user ? (
            <span className="hidden text-sm text-slate-600 sm:inline">
              {session.user.name ?? session.user.email}
            </span>
          ) : null}
        </div>
      </header>

      {!session?.user ? (
        <main className="relative flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 text-center">
          <CircuitBackground />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 max-w-2xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--vt-maroon)]">
              Virginia Tech · Degree planning
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              Map your path to graduation
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Upload your transcript, set preferences, and let five AI agents build a clear
              prerequisite map — optimized for professors, rigor, and your schedule.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="min-w-[200px]"
              >
                Sign in with Google
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  signIn("credentials", {
                    email: "demo@vt.edu",
                    password: "demo",
                    callbackUrl: "/",
                  })
                }
              >
                Demo login
              </Button>
            </div>
            <p className="mt-4 text-xs text-slate-500">Demo: demo@vt.edu / password: demo</p>
          </motion.div>
        </main>
      ) : (
        <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 pb-16 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold text-slate-900"
              >
                Hey, {session.user.name?.split(" ")[0] ?? "Hokie"} 👋
              </motion.h1>
              <p className="mt-1 text-slate-600">Your saved academic plans appear here.</p>
            </div>
            <Link href="/create">
              <Button type="button" className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Create new plan
              </Button>
            </Link>
          </div>

          {loadingPlans ? (
            <p className="mt-12 text-center text-slate-500">Loading plans…</p>
          ) : plans.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-16 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm"
            >
              <p className="text-lg text-slate-800">No plans yet — start your first roadmap.</p>
              <p className="mt-2 text-sm text-slate-500">
                Upload a transcript or use demo data to generate your degree plan.
              </p>
              <Link href="/create" className="mt-6 inline-block">
                <Button type="button">Start planning</Button>
              </Link>
            </motion.div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, i) => (
                <PlanCard key={plan.id} plan={plan} index={i} />
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
