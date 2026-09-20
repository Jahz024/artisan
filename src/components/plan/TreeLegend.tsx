"use client";

import { LINE_PALETTE } from "@/components/plan/tree-layout";

function Station({
  fill,
  stroke,
  width = 3,
  dashed,
}: {
  fill: string;
  stroke: string;
  width?: number;
  dashed?: boolean;
}) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full"
      style={{
        background: fill,
        border: `${width}px ${dashed ? "dashed" : "solid"} ${stroke}`,
      }}
      aria-hidden
    />
  );
}

/** Map key, in the spirit of the key box on a printed transit map. */
export function TreeLegend() {
  return (
    <div className="glass-panel mb-3 rounded-lg px-4 py-3 text-[13px] leading-relaxed text-[var(--ink-soft)]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-mono-accent text-base font-bold text-[var(--ink)]">Map key</span>
        <span className="inline-flex items-center gap-2">
          <Station fill="#1D1A24" stroke="#1D1A24" width={2} />
          Completed
        </span>
        <span className="inline-flex items-center gap-2">
          <Station fill="#E5751F" stroke="#1D1A24" />
          Taking now
        </span>
        <span className="inline-flex items-center gap-2">
          <Station fill="#FFFFFF" stroke="#861F41" width={4} />
          Next semester
        </span>
        <span className="inline-flex items-center gap-2">
          <Station fill="#FFFFFF" stroke="#1D1A24" />
          Planned
        </span>
        <span className="inline-flex items-center gap-2">
          <Station fill="#FFFFFF" stroke="#1D1A24" dashed />
          Estimate
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="flex gap-0.5" aria-hidden>
            {LINE_PALETTE.slice(0, 4).map((c) => (
              <span key={c} className="h-1.5 w-3 rounded-full" style={{ background: c }} />
            ))}
          </span>
          Prerequisite lines
        </span>
      </div>
      <p className="mt-1.5 text-[12px]">
        Each colored line is a prerequisite chain. Drag a course to another semester, or to the
        trash to replace it. A course can&apos;t move ahead of its prerequisites.
      </p>
    </div>
  );
}
