import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/40",
          "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
          "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800",
          error
            ? "border-red-400 focus:border-red-500 dark:border-red-700"
            : "border-slate-300 focus:border-brand-500 dark:border-slate-700",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
