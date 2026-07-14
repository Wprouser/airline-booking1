import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)} aria-hidden="true" />;
}

export function FlightCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-6 w-full max-w-xs" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex flex-col items-end gap-2 sm:w-40">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
