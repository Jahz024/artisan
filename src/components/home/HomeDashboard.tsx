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
    <div className="relative flex min-h-full flex-1 flex-col bg-circuit-grid">
      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--vt-maroon)]/30 text-sm font-bold text-[var(--vt-orange)] ring-1 ring-[var(--vt-maroon)]/50">
            VT
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-100">
            Hokie <span className="text-cyan-400">Pathfinder</span>
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
            <span className="hidden text-sm text-slate-400 sm:inline">
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
            <p className="font-mono-accent text-xs uppercase tracking-[0.3em] text-cyan-500/80">
              Virginia Tech · Degree planning
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-50 sm:text-5xl glow-text-cyan">
              Map your path to graduation
            </h1>
            <p className="mt-4 text-lg text-slate-400">
              Upload your transcript, set preferences, and watch five AI agents weave a glowing
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
            <p className="mt-4 text-xs text-slate-600">Demo: demo@vt.edu / password: demo</p>
          </motion.div>
        </main>
      ) : (
        <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 pb-16 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold text-slate-50"
              >
                Hey, {session.user.name?.split(" ")[0] ?? "Hokie"} 👋
              </motion.h1>
              <p className="mt-1 text-slate-400">Your saved academic paths light up here.</p>
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
              className="mt-16 rounded-2xl border border-dashed border-cyan-500/25 bg-slate-900/40 p-12 text-center"
            >
              <p className="text-lg text-slate-300">No plans yet — your first trace awaits.</p>
              <p className="mt-2 text-sm text-slate-500">
                Start with a transcript upload or demo data to generate a circuit-board roadmap.
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
