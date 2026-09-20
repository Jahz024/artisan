"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-cyan-500/20 text-cyan-100 border border-cyan-400/40 hover:bg-cyan-500/30 hover:shadow-[var(--glow-cyan)]",
  secondary:
    "bg-[var(--vt-maroon)]/20 text-orange-100 border border-[var(--vt-maroon)]/50 hover:border-[var(--vt-orange)]/60",
  ghost:
    "bg-transparent text-slate-300 border border-transparent hover:border-cyan-500/30 hover:text-cyan-100",
  danger:
    "bg-red-500/15 text-red-100 border border-red-400/40 hover:shadow-[var(--glow-red)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", loading, disabled, children, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-50 disabled:pointer-events-none",
          !disabled && !loading && "hover:scale-[1.02] active:scale-[0.98]",
          variants[variant],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
