"use client";

export function TreeLegend() {
  return (
    <div className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] leading-relaxed text-slate-600 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-slate-400"
            style={{ backgroundColor: "#94A3B8" }}
            aria-hidden
          />
          Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-emerald-600"
            style={{ backgroundColor: "#10B981" }}
            aria-hidden
          />
          Taking Now
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[#C4621A]"
            style={{ backgroundColor: "#E87722" }}
            aria-hidden
          />
          Next Up
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-amber-500"
            style={{ backgroundColor: "#FBBF24" }}
            aria-hidden
          />
          Planned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-5 w-8 shrink-0 rounded-full bg-slate-100"
            aria-hidden
          >
            <span className="block h-px w-full translate-y-[9px] bg-slate-300" />
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
