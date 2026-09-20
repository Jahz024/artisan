"use client";

import { motion } from "framer-motion";

export function CircuitBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg className="h-full w-full opacity-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0" />
            <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[...Array(8)].map((_, i) => (
          <motion.path
            key={i}
            d={`M ${-100 + i * 120} 0 L ${200 + i * 80} 400 L ${600 + i * 40} 800`}
            fill="none"
            stroke="url(#traceGrad)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{ pathLength: 1, opacity: [0.15, 0.45, 0.15] }}
            transition={{
              pathLength: { duration: 2 + i * 0.2, repeat: Infinity, repeatType: "reverse" },
              opacity: { duration: 3 + i * 0.3, repeat: Infinity },
            }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0E17]/50 to-[#0A0E17]" />
    </div>
  );
}
