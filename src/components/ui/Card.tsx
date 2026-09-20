"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
  glow?: "cyan" | "maroon" | "none";
  padding?: "sm" | "md" | "lg";
}

const glowMap = {
  cyan: "hover:border-slate-700 hover:shadow-md",
  maroon: "hover:border-[var(--vt-maroon)]/30 hover:shadow-md",
  none: "hover:shadow-md",
};

const padMap = {
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

export function Card({
  className,
  glow = "none",
  padding = "md",
  children,
  ...props
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-slate-800 bg-white shadow-sm transition-shadow duration-300",
        glowMap[glow],
        padMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
