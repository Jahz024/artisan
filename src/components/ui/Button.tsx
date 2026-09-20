"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

// Buttons borrow from station signage: solid color plates with a heavy ink edge.
const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--maroon)] text-white border-2 border-[var(--maroon)] hover:bg-[#6f1936] hover:border-[#6f1936]",
  secondary:
    "bg-[var(--paper-raised)] text-[var(--ink)] border-2 border-[var(--ink)] hover:bg-white",
  ghost:
    "bg-transparent text-[var(--ink-soft)] border-2 border-transparent hover:text-[var(--ink)] hover:bg-[var(--ink)]/5",
  danger:
    "bg-[var(--danger)] text-white border-2 border-[var(--danger)] hover:bg-[#a82826]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", loading, disabled, children, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-mono-accent text-[15px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
