"use client";

export function TreeLegend() {
  return (
    <div className="glass-panel mb-3 rounded-xl px-4 py-2.5 text-[11px] leading-relaxed text-slate-400">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[#4B5563]"
            style={{ backgroundColor: "#6B7280" }}
            aria-hidden
          />
          Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[#059669] shadow-[0_0_6px_rgba(16,185,129,0.6)]"
            style={{ backgroundColor: "#10B981" }}
            aria-hidden
          />
          Taking Now
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[#D97706]"
            style={{ backgroundColor: "#F59E0B" }}
            aria-hidden
          />
          Planned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-5 w-8 shrink-0 rounded-full bg-slate-500/20"
            aria-hidden
          >
            <span className="block h-px w-full translate-y-[9px] bg-slate-400/50" />
          </span>
          Prerequisite
        </span>
      </div>
      <p className="mt-1.5 text-slate-500">
        Drag courses between semesters · Click to view details · Lines show prerequisites — a
        course can&apos;t move before its prereqs
      </p>
    </div>
  );
}
