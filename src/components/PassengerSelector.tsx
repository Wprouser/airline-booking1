import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Users } from "lucide-react";

const MIN = 1;
const MAX = 9;

export function PassengerSelector({ value, onChange }: { value: number; onChange: (count: number) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Not a native <label>: it doesn't target a form control (the button below carries its own
          accessible name from its text so the count is announced, not just the static caption). */}
      <div className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">Passengers</div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-9 text-left text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        {value} passenger{value > 1 ? "s" : ""}
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-elevated dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Passengers</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={value <= MIN}
                onClick={() => onChange(Math.max(MIN, value - 1))}
                aria-label="Decrease passengers"
                className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-4 text-center text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {value}
              </span>
              <button
                type="button"
                disabled={value >= MAX}
                onClick={() => onChange(Math.min(MAX, value + 1))}
                aria-label="Increase passengers"
                className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Up to {MAX} passengers per booking</p>
        </div>
      )}
    </div>
  );
}
