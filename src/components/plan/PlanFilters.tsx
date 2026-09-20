"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Gauge,
  ListTree,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import type { PlanGraph, PlanNode, UserPreferences } from "@/types/contracts";
import { Button } from "@/components/ui/Button";
import { cn, formatCourseCode, termKey } from "@/lib/utils";
import { creditsForNode, sumSemesterCredits } from "@/lib/plan-credits";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";

const SWEET_SPOT_MIN = 15;
const SWEET_SPOT_MAX = 16;

const DAY_PILLS = [
  { key: "M", label: "M", value: "Mon" },
  { key: "T", label: "T", value: "Tue" },
  { key: "W", label: "W", value: "Wed" },
  { key: "Th", label: "Th", value: "Thu" },
  { key: "F", label: "F", value: "Fri" },
] as const;

const START_OPTIONS = [
  { label: "8:00 AM", value: "08:00" },
  { label: "9:00 AM", value: "09:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "11:00 AM", value: "11:00" },
] as const;

const END_OPTIONS = [
  { label: "3:00 PM", value: "15:00" },
  { label: "4:00 PM", value: "16:00" },
  { label: "5:00 PM", value: "17:00" },
  { label: "7:00 PM", value: "19:00" },
] as const;

const QUICK_SUGGESTIONS = [
  "Best professors",
  "No 8 AMs",
  "Lighter semesters",
  "Graduate sooner",
] as const;

function requirementMeta(blockId: string): { label: string; accent: string } {
  const id = blockId.toLowerCase();
  if (id.includes("pathways") || id.includes("gen")) {
    return { label: "Gen Ed", accent: "bg-sky-500" };
  }
  if (id.includes("free")) {
    return { label: "Free Elective", accent: "bg-slate-600" };
  }
  if (id.includes("minor")) {
    return { label: "Minor Req", accent: "bg-violet-500" };
  }
  if (id.includes("elective")) {
    return { label: "Elective", accent: "bg-[#E87722]" };
  }
  if (id.includes("core") || id.includes("major") || id.includes("cs-")) {
    return { label: "Major Req", accent: "bg-[#861F41]" };
  }
  return { label: "Requirement", accent: "bg-slate-600" };
}

function FilterSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Target;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <Icon className="h-4 w-4 text-[#861F41]" aria-hidden />
        {title}
      </h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function LightSlider({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold tabular-nums text-[#861F41]">{value}</span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-900">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#861F41] to-[#E87722]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-[#861F41] shadow-sm"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function selectClassName() {
  return "mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-[#861F41]/40 focus:outline-none focus:ring-2 focus:ring-[#861F41]/15";
}

export interface PlanFiltersProps {
  planGraph: PlanGraph | null;
  preferences: UserPreferences;
  onPreferencesChange: (next: UserPreferences) => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

export function PlanFilters({
  planGraph,
  preferences,
  onPreferencesChange,
  onRegenerate,
  regenerating,
}: PlanFiltersProps) {
  const [tweakText, setTweakText] = useState("");
  const [latestEnd, setLatestEnd] = useState("17:00");
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(() => new Set());

  const maxCredits = preferences.creditLoadMax;
  const inSweetSpot = maxCredits >= SWEET_SPOT_MIN && maxCredits <= SWEET_SPOT_MAX;

  const semesterRows = useMemo(() => {
    if (!planGraph) return [];
    const nodeById = new Map(planGraph.nodes.map((n) => [n.id, n]));
    return planGraph.semesters.map((sem) => {
      const nodes = sem.nodeIds
        .map((id) => nodeById.get(id))
        .filter((n): n is PlanNode => Boolean(n));
      const credits = sumSemesterCredits(nodes);
      return { sem, nodes, credits, tk: termKey(sem.term) };
    });
  }, [planGraph]);

  useEffect(() => {
    if (semesterRows.length === 0) return;
    setExpandedTerms((prev) => {
      if (prev.size > 0) return prev;
      return new Set([semesterRows[0]?.tk].filter(Boolean));
    });
  }, [semesterRows]);

  const preferredDays = preferences.timePreferences.preferredDays ?? [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
  ];

  const patchPrefs = (partial: Partial<UserPreferences>) => {
    onPreferencesChange({ ...preferences, ...partial });
  };

  const patchTimePrefs = (partial: Partial<UserPreferences["timePreferences"]>) => {
    onPreferencesChange({
      ...preferences,
      timePreferences: { ...preferences.timePreferences, ...partial },
    });
  };

  const patchWeights = (partial: Partial<UserPreferences["priorityWeights"]>) => {
    onPreferencesChange({
      ...preferences,
      priorityWeights: { ...preferences.priorityWeights, ...partial },
    });
  };

  const toggleDay = (day: string) => {
    const next = preferredDays.includes(day)
      ? preferredDays.filter((d) => d !== day)
      : [...preferredDays, day];
    patchTimePrefs({ preferredDays: next.length ? next : preferredDays });
  };

  const toggleTermExpanded = (tk: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(tk)) next.delete(tk);
      else next.add(tk);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <FilterSection icon={Clock} title="Time preferences">
        <div>
          <p className="text-xs font-medium text-slate-400">Preferred days</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DAY_PILLS.map((d) => {
              const active = preferredDays.includes(d.value);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={cn(
                    "min-w-[2.25rem] rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                    active
                      ? "border-[#861F41] bg-[#861F41] text-white shadow-sm"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-orange-50 hover:border-slate-700"
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-slate-400">
            Earliest start
            <select
              className={selectClassName()}
              value={preferences.timePreferences.noClassesBefore ?? "09:00"}
              onChange={(e) => patchTimePrefs({ noClassesBefore: e.target.value })}
            >
              {START_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-400">
            Latest end
            <select
              className={selectClassName()}
              value={latestEnd}
              onChange={(e) => setLatestEnd(e.target.value)}
            >
              {END_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
          <span className="text-sm font-medium text-slate-300">No Friday classes</span>
          <input
            type="checkbox"
            checked={preferences.timePreferences.noFridayClasses}
            onChange={(e) => patchTimePrefs({ noFridayClasses: e.target.checked })}
            className="h-4 w-4 rounded border-slate-700 text-[#861F41] focus:ring-[#861F41]/30"
          />
        </label>
      </FilterSection>

      <FilterSection icon={Target} title="Credit target">
        <p className="text-xs text-slate-500">
          Current load by semester — adjust your max credits per term.
        </p>
        <ul className="space-y-1.5 rounded-xl border border-slate-900 bg-slate-950/80 p-2">
          {semesterRows.length === 0 ? (
            <li className="px-2 py-1 text-xs text-slate-500">No semesters in plan yet.</li>
          ) : (
            semesterRows.map(({ sem, credits, tk }) => (
              <li
                key={tk}
                className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs shadow-sm"
              >
                <span className="font-medium text-slate-300">{sem.term.label}</span>
                <span className="tabular-nums text-slate-400">
                  {credits} cr
                  {preferences.semesterCreditOverrides?.[tk] !== undefined ? (
                    <span className="ml-1 text-[#861F41]">
                      (target {preferences.semesterCreditOverrides[tk]})
                    </span>
                  ) : null}
                </span>
              </li>
            ))
          )}
        </ul>
        <LightSlider
          label="Max credits / semester"
          value={maxCredits}
          min={12}
          max={19}
          onChange={(v) => patchPrefs({ creditLoadMax: v, creditLoadMin: Math.min(preferences.creditLoadMin, v) })}
        />
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span className="font-semibold tabular-nums text-slate-100">{maxCredits} credits</span>
          {inSweetSpot ? (
            <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-[#E87722] ring-1 ring-[#E87722]/25">
              Sweet spot
            </span>
          ) : (
            <span className="text-xs text-slate-500">Most Hokies aim for 15–16</span>
          )}
        </p>
      </FilterSection>

      <FilterSection icon={Gauge} title="Priority weights">
        <LightSlider
          label="Professor rating"
          value={preferences.priorityWeights.professorRating}
          min={1}
          max={10}
          onChange={(v) => patchWeights({ professorRating: v })}
        />
        <LightSlider
          label="Rigor preference"
          value={preferences.priorityWeights.rigorPreference}
          min={1}
          max={10}
          onChange={(v) => patchWeights({ rigorPreference: v })}
          hint="Higher = tougher courses OK"
        />
        <LightSlider
          label="Time fit"
          value={preferences.priorityWeights.timePreferenceFit}
          min={1}
          max={10}
          onChange={(v) => patchWeights({ timePreferenceFit: v })}
        />
        <LightSlider
          label="Graduate sooner"
          value={preferences.priorityWeights.graduatingSooner}
          min={1}
          max={10}
          onChange={(v) => patchWeights({ graduatingSooner: v })}
        />
      </FilterSection>

      <FilterSection icon={Wand2} title="Quick actions">
        <label className="block text-xs font-medium text-slate-400">
          Describe what you&apos;d like to change…
          <textarea
            value={tweakText}
            onChange={(e) => setTweakText(e.target.value)}
            rows={3}
            placeholder="e.g. Swap CS 3214 for an easier algorithms elective…"
            className="mt-1 w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-[#861F41]/40 focus:outline-none focus:ring-2 focus:ring-[#861F41]/15"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {QUICK_SUGGESTIONS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setTweakText(chip)}
              className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-[#E87722]/40 hover:bg-orange-50"
            >
              {chip}
            </button>
          ))}
        </div>
        <Button
          type="button"
          className="w-full border-[#861F41]/50 bg-[#861F41] text-white hover:bg-[#6d1834] hover:shadow-md"
          loading={regenerating}
          onClick={() => onRegenerate?.()}
        >
          <Sparkles className="h-4 w-4" />
          Regenerate plan
        </Button>
      </FilterSection>

      <p className="flex items-center gap-1.5 px-1 text-[10px] text-slate-400">
        <Calendar className="h-3 w-3" aria-hidden />
        Filter changes apply locally until you regenerate.
      </p>
    </div>
  );
}

/* ─── Semester Course List (rendered below the graph) ─────────────── */

export interface SemesterCourseListProps {
  planGraph: PlanGraph | null;
  /** When true, only show major-required courses (not electives/pathways) */
  requiredOnly?: boolean;
}

export function SemesterCourseList({ planGraph, requiredOnly }: SemesterCourseListProps) {
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(() => new Set());

  const semesterRows = useMemo(() => {
    if (!planGraph) return [];
    const nodeById = new Map(planGraph.nodes.map((n) => [n.id, n]));
    return planGraph.semesters
      .map((sem) => {
        let nodes = sem.nodeIds
          .map((id) => nodeById.get(id))
          .filter((n): n is PlanNode => Boolean(n));
        if (requiredOnly) {
          nodes = nodes.filter((n) => {
            const id = n.requirementBlockId.toLowerCase();
            return (
              id.includes("core") ||
              id.includes("major") ||
              id.startsWith("cs-") ||
              id.startsWith("math-") ||
              id.startsWith("statistics") ||
              id.startsWith("science")
            );
          });
        }
        const credits = sumSemesterCredits(nodes);
        return { sem, nodes, credits, tk: termKey(sem.term) };
      })
      .filter((row) => row.nodes.length > 0);
  }, [planGraph, requiredOnly]);

  useEffect(() => {
    if (semesterRows.length === 0) return;
    setExpandedTerms((prev) => {
      if (prev.size > 0) return prev;
      return new Set([semesterRows[0]?.tk].filter(Boolean));
    });
  }, [semesterRows]);

  const toggleTermExpanded = (tk: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(tk)) next.delete(tk);
      else next.add(tk);
      return next;
    });
  };

  if (!planGraph || semesterRows.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-800/80 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <ListTree className="h-4 w-4 text-[#861F41]" aria-hidden />
        {requiredOnly ? "Required courses by semester" : "Semester course list"}
      </h3>
      <ul className="mt-3 space-y-2">
        {semesterRows.map(({ sem, nodes, credits, tk }) => {
          const open = expandedTerms.has(tk);
          return (
            <li key={tk} className="overflow-hidden rounded-xl border border-slate-900 bg-slate-950/50">
              <button
                type="button"
                onClick={() => toggleTermExpanded(tk)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-950"
              >
                <span className="flex items-center gap-1.5 font-medium text-slate-100">
                  {open ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                  {sem.term.label}
                </span>
                <span className="text-xs tabular-nums text-slate-500">{credits} cr</span>
              </button>
              {open ? (
                <ul className="space-y-1 border-t border-slate-900 px-2 pb-2 pt-1">
                  {nodes.map((node) => {
                    const meta = requirementMeta(node.requirementBlockId);
                    const title =
                      DEMO_COURSE_TITLES[node.courseId]?.title ??
                      formatCourseCode(node.courseId);
                    return (
                      <li
                        key={node.id}
                        className="flex gap-2 rounded-lg border border-slate-900 bg-white py-2 pl-0 pr-2 shadow-sm"
                      >
                        <div className={cn("w-1 shrink-0 rounded-l-lg", meta.accent)} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-xs font-bold text-slate-100">
                              {formatCourseCode(node.courseId)}
                            </span>
                            <span className="text-xs text-slate-500 tabular-nums">
                              {creditsForNode(node)} cr
                            </span>
                          </div>
                          <p className="truncate text-xs text-slate-400">{title}</p>
                          <span className="mt-0.5 inline-block rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            {meta.label}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
