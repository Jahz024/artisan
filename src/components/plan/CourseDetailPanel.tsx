"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Star, X } from "lucide-react";
import type { PlanNode, PresentationSpec, TermType } from "@/types/contracts";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getNodeAnnotation } from "@/components/plan/CourseNode";
import { cn, formatCourseCode } from "@/lib/utils";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";

interface CourseDetailPanelProps {
  node: PlanNode | null;
  presentationSpec?: PresentationSpec | null;
  onClose: () => void;
  onSwapAlternative?: (node: PlanNode, courseId: string, instructor?: string) => void;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`Rating ${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-600"
          )}
        />
      ))}
    </div>
  );
}

type OfferingDot = "always" | "usually" | "rarely" | "never";

function OfferingGrid() {
  const terms: TermType[] = ["fall", "spring", "summer"];
  const pattern: Record<TermType, OfferingDot> = {
    fall: "usually",
    spring: "usually",
    summer: "rarely",
  };
  return (
    <div className="grid grid-cols-3 gap-2 text-center text-[12px] text-[var(--ink-soft)]">
      {terms.map((t) => (
        <div key={t}>
          <p>{t}</p>
          <div
            className={cn(
              "mx-auto mt-1 h-3 w-3 rounded-full",
              pattern[t] === "usually" && "bg-cyan-400/80",
              pattern[t] === "rarely" && "bg-slate-600",
              pattern[t] === "always" && "bg-emerald-400"
            )}
          />
        </div>
      ))}
    </div>
  );
}

export function CourseDetailPanel({
  node,
  presentationSpec,
  onClose,
  onSwapAlternative,
}: CourseDetailPanelProps) {
  const meta = node ? DEMO_COURSE_TITLES[node.courseId] : null;
  const annotation = node ? getNodeAnnotation(presentationSpec, node.id) : undefined;
  const rmpRating = 4.2;
  const difficulty = node?.scoreBreakdown.rigorMatch ?? 3;
  const wouldTakeAgain = 78;

  return (
    <AnimatePresence>
      {node ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-40 bg-[var(--ink)]/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label="Close course details"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-cyan-500/20 bg-slate-950/95 shadow-2xl"
            aria-label="Course details"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-5">
              <div>
                <p className="font-mono-accent text-sm text-cyan-300">
                  {formatCourseCode(node.courseId)}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-100">
                  {meta?.title ?? "Course details"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{meta?.credits ?? 3} credits</p>
              </div>
              <Button variant="ghost" type="button" aria-label="Close panel" onClick={onClose} className="!p-2">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant={node.status} />
                {node.warnings.map((w) => (
                  <Badge key={w} variant="warning">
                    {w.slice(0, 24)}
                  </Badge>
                ))}
              </div>

              <section>
                <h3 className="font-mono-accent text-[15px] font-bold text-[var(--ink)]">
                  Requirement
                </h3>
                <p className="mt-1 text-sm text-slate-200">{node.requirementBlockId}</p>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-mono-accent text-[15px] font-bold text-[var(--ink)]">Instructor</h3>
                  <p className="mt-1 text-sm text-slate-200">{node.instructor ?? "TBD"}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Stars rating={rmpRating} />
                    <span className="text-xs text-slate-400">{rmpRating.toFixed(1)} RMP</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-mono-accent text-[15px] font-bold text-[var(--ink)]">Would take again</h3>
                  <p className="mt-1 text-2xl font-semibold text-emerald-300">{wouldTakeAgain}%</p>
                </div>
              </section>

              <section>
                <h3 className="font-mono-accent text-[15px] font-bold text-[var(--ink)]">Difficulty</h3>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500"
                    style={{ width: `${(difficulty / 10) * 100}%` }}
                  />
                </div>
              </section>

              <section>
                <h3 className="font-mono-accent text-[15px] font-bold text-[var(--ink)]">Rigor summary</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  Expect steady weekly projects with exams weighted toward theory. Office hours are well
                  attended — start problem sets early.
                </p>
              </section>

              <section>
                <h3 className="font-mono-accent text-[15px] font-bold text-[var(--ink)]">Section times</h3>
                <p className="mt-1 text-sm text-slate-300">MWF 10:10–11:00 · McBryde 113</p>
              </section>

              <section>
                <h3 className="font-mono-accent text-[15px] font-bold text-[var(--ink)]">Historic offerings</h3>
                <OfferingGrid />
              </section>

              {annotation ? (
                <section className="rounded-xl border border-pink-500/30 bg-pink-500/10 p-3">
                  <h3 className="font-mono-accent text-[15px] font-bold text-[var(--maroon)]">Agent 4 note</h3>
                  <p className="mt-1 text-sm text-pink-100/90">{annotation}</p>
                </section>
              ) : null}

              {node.alternatives.length > 0 ? (
                <section>
                  <h3 className="font-mono-accent text-[15px] font-bold text-[var(--ink)]">Alternatives</h3>
                  <ul className="mt-2 space-y-2">
                    {node.alternatives.map((alt, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-slate-700/60 p-2 text-left text-sm hover:border-cyan-500/40"
                          onClick={() =>
                            onSwapAlternative?.(
                              node,
                              alt.courseId ?? node.courseId,
                              alt.instructor
                            )
                          }
                        >
                          <span className="font-mono-accent text-cyan-300">
                            {formatCourseCode(alt.courseId ?? node.courseId)}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">Score {alt.score}</span>
                          <p className="text-xs text-slate-400">{alt.reason}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
