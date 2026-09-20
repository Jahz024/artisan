"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, FileUp, Sparkles } from "lucide-react";
import { getDemoTranscript, DEMO_PRESETS, type DemoPreset } from "@/lib/transcript-parser";
import type { TranscriptParseResult } from "@/lib/transcript-parser";
import type { UserPreferences } from "@/types/contracts";
import { Button } from "@/components/ui/Button";
import { Slider, Toggle } from "@/components/ui/Slider";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

const STEPS = ["Transcript", "Program", "Preferences", "Name & generate"];

const defaultPreferences: UserPreferences = {
  targetGraduation: { year: 2027, termType: "fall", label: "Fall 2027" },
  creditLoadMin: 12,
  creditLoadMax: 19,
  allowSummer: false,
  timePreferences: {
    preferEvening: false,
    noFridayClasses: true,
    noClassesBefore: "09:00",
  },
  electiveInterests: [],
  electiveTags: [],
  priorityWeights: {
    professorRating: 8,
    rigorPreference: 5,
    timePreferenceFit: 7,
    graduatingSooner: 8,
  },
};

export function CreatePlanWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptParseResult | null>(null);
  const [major, setMajor] = useState("Computer Science");
  const [minors, setMinors] = useState("");
  const [catalogYear, setCatalogYear] = useState("2024");
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [interestsText, setInterestsText] = useState("machine learning, systems");
  const [planName, setPlanName] = useState("My CS Path");
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = ((step + 1) / STEPS.length) * 100;

  const applyTranscript = (data: TranscriptParseResult) => {
    setTranscript(data);
    if (data.major) setMajor(data.major);
    if (data.minors?.length) setMinors(data.minors.join(", "));
    if (data.catalogYear) setCatalogYear(data.catalogYear);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/transcript", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      applyTranscript(data as TranscriptParseResult);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const useDemo = (preset: DemoPreset) => {
    const data = getDemoTranscript(preset.id);
    applyTranscript(data);
    setPreferences((p) => ({ ...p, targetGraduation: preset.targetGrad }));
    setStep(1);
  };

  const submitPlan = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const prefs = {
        ...preferences,
        electiveInterests: interestsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        completedCourses: transcript?.completedCourses,
        inProgressCourses: transcript?.inProgressCourses,
      };

      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName,
          major,
          minors: minors
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          catalogYear,
          preferences: prefs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create plan");
      router.push(`/plan/${data.plan.id}?generate=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create plan");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void uploadFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-[var(--vt-maroon)]">
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-slate-900">Create your plan</h1>
      <p className="mt-2 text-slate-600">Four steps to your personalized graduation map.</p>

      <div className="mt-8">
        <div className="mb-2 flex justify-between text-xs text-slate-500">
          {STEPS.map((label, i) => (
            <span key={label} className={cn(i <= step && "font-medium text-[var(--vt-maroon)]")}>
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <ProgressBar value={progress} label="Progress" color="cyan" />
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Card className="mt-8 min-h-[360px]">
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 transition-shadow",
                  dragOver ? "border-[var(--vt-orange)] bg-orange-50/50" : "border-slate-300 bg-white"
                )}
              >
                <FileUp className="h-10 w-10 text-[var(--vt-maroon)]" />
                <p className="mt-4 text-center text-slate-800">Drop your VT transcript PDF here</p>
                <p className="mt-1 text-sm text-slate-500">or choose a file</p>
                <label className="mt-6 cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    id="transcript-upload"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadFile(f);
                    }}
                  />
                  <span className="inline-flex">
                    <Button type="button" loading={uploading} onClick={() => document.getElementById("transcript-upload")?.click()}>
                      Browse PDF
                    </Button>
                  </span>
                </label>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500">Or try a demo student:</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {DEMO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => useDemo(preset)}
                      className="flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-all hover:border-[var(--vt-orange)]/50 hover:bg-orange-50/50 hover:shadow-sm"
                    >
                      <span className="text-lg leading-none">{preset.emoji}</span>
                      <span className="text-sm font-semibold text-slate-900">{preset.label}</span>
                      <span className="text-[11px] text-slate-500">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}

          {step === 1 ? (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-slate-400">
                {transcript
                  ? `${transcript.completedCourses.length} completed · ${transcript.inProgressCourses.length} in progress`
                  : "Confirm your program details"}
              </p>
              <label className="block text-sm">
                <span className="text-slate-400">Major</span>
                <input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-[var(--vt-maroon)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--vt-maroon)]/20"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Minors (comma-separated)</span>
                <input
                  value={minors}
                  onChange={(e) => setMinors(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-[var(--vt-maroon)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--vt-maroon)]/20"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Catalog year</span>
                <input
                  value={catalogYear}
                  onChange={(e) => setCatalogYear(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-[var(--vt-maroon)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--vt-maroon)]/20"
                />
              </label>
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                How many credits do you want per semester? Most students take 15-16. The maximum
                allowed is 19 (overloads require approval).
              </p>
              <Slider
                label="Min credits / semester"
                value={preferences.creditLoadMin}
                min={9}
                max={18}
                onChange={(v) => setPreferences((p) => ({ ...p, creditLoadMin: v }))}
              />
              <Slider
                label="Max credits / semester"
                value={preferences.creditLoadMax}
                min={12}
                max={21}
                onChange={(v) => setPreferences((p) => ({ ...p, creditLoadMax: v }))}
              />
              <Toggle
                label="Allow summer courses"
                checked={preferences.allowSummer}
                onChange={(v) => setPreferences((p) => ({ ...p, allowSummer: v }))}
              />
              <Toggle
                label="No Friday classes"
                checked={preferences.timePreferences.noFridayClasses}
                onChange={(v) =>
                  setPreferences((p) => ({
                    ...p,
                    timePreferences: { ...p.timePreferences, noFridayClasses: v },
                  }))
                }
              />
              <Toggle
                label="Prefer evening sections"
                checked={preferences.timePreferences.preferEvening}
                onChange={(v) =>
                  setPreferences((p) => ({
                    ...p,
                    timePreferences: { ...p.timePreferences, preferEvening: v },
                  }))
                }
              />
              <label className="block text-sm">
                <span className="text-slate-400">No classes before</span>
                <input
                  type="time"
                  value={preferences.timePreferences.noClassesBefore ?? "09:00"}
                  onChange={(e) =>
                    setPreferences((p) => ({
                      ...p,
                      timePreferences: { ...p.timePreferences, noClassesBefore: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Elective interests</span>
                <input
                  value={interestsText}
                  onChange={(e) => setInterestsText(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                />
              </label>
              <Slider
                label="Professor rating priority"
                value={preferences.priorityWeights.professorRating}
                onChange={(v) =>
                  setPreferences((p) => ({
                    ...p,
                    priorityWeights: { ...p.priorityWeights, professorRating: v },
                  }))
                }
              />
              <Slider
                label="Rigor preference"
                hint="Higher = tougher courses OK"
                value={preferences.priorityWeights.rigorPreference}
                onChange={(v) =>
                  setPreferences((p) => ({
                    ...p,
                    priorityWeights: { ...p.priorityWeights, rigorPreference: v },
                  }))
                }
              />
              <Slider
                label="Schedule fit priority"
                value={preferences.priorityWeights.timePreferenceFit}
                onChange={(v) =>
                  setPreferences((p) => ({
                    ...p,
                    priorityWeights: { ...p.priorityWeights, timePreferenceFit: v },
                  }))
                }
              />
              <Slider
                label="Graduate sooner priority"
                value={preferences.priorityWeights.graduatingSooner}
                onChange={(v) =>
                  setPreferences((p) => ({
                    ...p,
                    priorityWeights: { ...p.priorityWeights, graduatingSooner: v },
                  }))
                }
              />
            </motion.div>
          ) : null}

          {step === 3 ? (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <label className="block text-sm">
                <span className="text-slate-400">Plan name</span>
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg text-slate-900 focus:border-[var(--vt-maroon)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--vt-maroon)]/20"
                />
              </label>
              <p className="text-sm text-slate-500">
                We&apos;ll run the agent pipeline and stream progress live on the next screen.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-8 flex justify-between border-t border-slate-200 pt-6">
          <Button variant="ghost" type="button" onClick={back} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next} disabled={step === 0 && !transcript}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" loading={submitting} onClick={() => void submitPlan()}>
              Generate plan
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
