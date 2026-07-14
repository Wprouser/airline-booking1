import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "success" | "neutral" | "danger" | "info" | "brand";

const VARIANT_CLASSES: Record<Variant, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  neutral: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  brand: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300",
};

export function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
