import { Check } from "lucide-react";
import { cn } from "../lib/cn";

const STEPS = [
  "Search",
  "Select Flights",
  "Passenger Details",
  "Seat Selection",
  "Additional Services",
  "Summary",
  "Payment",
  "Confirmation",
];

export function WizardSteps({ current }: { current: number }) {
  return (
    <ol className="mb-6 flex snap-x gap-1 overflow-x-auto pb-2 text-xs font-medium sm:flex-wrap sm:overflow-visible">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const state = step === current ? "current" : step < current ? "done" : "upcoming";
        return (
          <li key={label} className="flex shrink-0 snap-start items-center">
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors",
                state === "current" &&
                  "bg-brand-600 text-white shadow-soft dark:bg-brand-500",
                state === "done" && "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
                state === "upcoming" && "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",
              )}
            >
              <span
                className={cn(
                  "grid h-4 w-4 place-items-center rounded-full text-[10px]",
                  state === "current" ? "bg-white/25" : state === "done" ? "bg-brand-600 text-white" : "bg-slate-300 dark:bg-slate-600",
                )}
              >
                {state === "done" ? <Check className="h-2.5 w-2.5" /> : step}
              </span>
              {label}
            </span>
            {step < STEPS.length && <span className="mx-1 text-slate-300 dark:text-slate-700">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
