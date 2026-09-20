"use client";

import { motion } from "framer-motion";

/** Very subtle light background accent — no animated circuit traces. */
export function CircuitBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(134, 31, 65, 0.04) 0%, transparent 45%),
            radial-gradient(circle at 80% 70%, rgba(232, 119, 34, 0.05) 0%, transparent 40%)
          `,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/30 to-slate-50" />
    </div>
  );
}
