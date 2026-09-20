"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { PlanNode } from "@/types/contracts";
import { Badge } from "@/components/ui/Badge";
import { formatCourseCode } from "@/lib/utils";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";

interface TreeTooltipProps {
  node: PlanNode | null;
  anchorX: number;
  anchorY: number;
  visible: boolean;
}

export function TreeTooltip({ node, anchorX, anchorY, visible }: TreeTooltipProps) {
  const title =
    node &&
    (DEMO_COURSE_TITLES[node.courseId]?.title ?? node.courseId.replace("-", " "));

  return (
    <AnimatePresence>
      {visible && node ? (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute z-50 w-52 rounded-xl border border-slate-800 bg-white p-3 shadow-lg"
          style={{
            left: anchorX + 18,
            top: anchorY - 12,
          }}
          role="tooltip"
        >
          <p className="font-mono-accent text-xs font-semibold text-slate-100">
            {formatCourseCode(node.courseId)}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">{title}</p>
          <p className="mt-2 text-[10px] text-slate-500">
            {node.instructor ? `Prof. ${node.instructor}` : "Instructor TBD"}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Badge variant={node.status} className="!text-[9px]" />
            <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono-accent text-[10px] text-slate-300">
              Score {node.score}
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
