import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200", className)}
      {...props}
    >
      {children}
    </h2>
  );
}
