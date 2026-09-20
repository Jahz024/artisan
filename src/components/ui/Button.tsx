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
    "bg-[var(--vt-maroon)] text-white border border-[var(--vt-maroon)] hover:bg-[#6d1835] hover:shadow-md",
  secondary:
    "bg-white text-[var(--vt-maroon)] border border-slate-200 hover:border-[var(--vt-orange)] hover:text-[var(--vt-orange)] hover:shadow-sm",
  ghost:
    "bg-transparent text-slate-600 border border-transparent hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
  danger:
    "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:shadow-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", loading, disabled, children, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vt-maroon)]/40 disabled:opacity-50 disabled:pointer-events-none",
          !disabled && !loading && "hover:scale-[1.02] active:scale-[0.98]",
          variants[variant],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
