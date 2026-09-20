"use client";

import { motion } from "framer-motion";
import type { AlternativeOption, PlanNode } from "@/types/contracts";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCourseCode } from "@/lib/utils";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";

interface ReplacementModalProps {
  open: boolean;
  onClose: () => void;
  removedNode: PlanNode | null;
  onSelectReplacement: (option: AlternativeOption) => void;
}

export function ReplacementModal({
  open,
  onClose,
  removedNode,
  onSelectReplacement,
}: ReplacementModalProps) {
  const alternatives = removedNode?.alternatives ?? [];
  const hasOptions = alternatives.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Choose a replacement">
      {!removedNode ? null : (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Removed{" "}
            <span className="font-mono-accent text-cyan-300">
              {formatCourseCode(removedNode.courseId)}
            </span>
            . Pick an alternative or reschedule manually.
          </p>

          {hasOptions ? (
            <ul className="space-y-2">
              {alternatives
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((opt, i) => {
                  const cid = opt.courseId ?? removedNode.courseId;
                  const meta = DEMO_COURSE_TITLES[cid];
                  return (
                    <motion.li
                      key={`${cid}-${opt.instructor ?? i}`}
                      whileHover={{ scale: 1.01 }}
                      className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => onSelectReplacement(opt)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-accent text-sm text-cyan-200">
                            {formatCourseCode(cid)}
                          </span>
                          <span className="text-xs text-slate-400">Score {opt.score}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-200">
                          {meta?.title ?? "Course alternative"}
                        </p>
                        {opt.instructor ? (
                          <p className="text-xs text-slate-500">{opt.instructor}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-400">{opt.reason}</p>
                      </button>
                    </motion.li>
                  );
                })}
            </ul>
          ) : (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              This requirement has no scored alternatives. Try moving another elective here or pick a
              different semester from the plan view.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
