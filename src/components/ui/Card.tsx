"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
  glow?: "cyan" | "maroon" | "none";
  padding?: "sm" | "md" | "lg";
}

const glowMap = {
  cyan: "hover:border-cyan-400/40 hover:shadow-[var(--glow-cyan)]",
  maroon: "hover:border-[var(--vt-maroon)]/50 hover:shadow-[0_0_20px_rgba(134,31,65,0.35)]",
  none: "",
};

const padMap = {
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

export function Card({
  className,
  glow = "cyan",
  padding = "md",
  children,
  ...props
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-panel rounded-xl transition-shadow duration-300",
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
