"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Plus, Volume2, VolumeX } from "lucide-react";
import type { Session } from "next-auth";
import type { PlanSummary } from "@/types/plan";
import { HokieLineHero } from "@/components/home/HokieLineHero";
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
          {/* Roundel-style mark: an interchange station */}
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full border-[5px] border-[var(--maroon)] bg-white"
            aria-hidden
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--orange)]" />
          </span>
          <span className="font-mono-accent text-2xl font-extrabold text-[var(--ink)]">
            Artisan
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
        <main className="relative flex flex-1 flex-col justify-center px-6 pb-16 pt-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 mx-auto w-full max-w-6xl"
          >
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.95] text-[var(--ink)] sm:text-7xl">
              Map your route to graduation
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--ink-soft)]">
              Upload your transcript and tell us how you like to learn. Five agents check VT
              requirements, years of past timetables, and professor ratings, then draw your degree
              as a map you can rearrange.
            </p>

            <div className="mt-10 -mx-2 sm:mx-0">
              <HokieLineHero />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="min-w-[220px]"
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
                Try the demo
              </Button>
              <p className="text-sm text-[var(--ink-soft)] sm:ml-2">
                Demo account: demo@vt.edu / demo
              </p>
            </div>
          </motion.div>
        </main>
      ) : (
        <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 pb-16 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-5xl font-extrabold leading-none text-[var(--ink)]"
              >
                Your routes, {session.user.name?.split(" ")[0] ?? "Hokie"}
              </motion.h1>
              <p className="mt-2 text-[var(--ink-soft)]">
                Open a saved plan to keep editing, or map a new one.
              </p>
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
              className="mt-12 rounded-xl border-[3px] border-dashed border-[var(--ink)]/25 p-12"
            >
              <p className="font-mono-accent text-2xl font-bold text-[var(--ink)]">No plans yet</p>
              <p className="mt-2 max-w-md text-[var(--ink-soft)]">
                Upload your transcript, or use the demo data, and the agents will draw your first
                route to graduation.
              </p>
              <Link href="/create" className="mt-6 inline-block">
                <Button type="button">Create new plan</Button>
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
