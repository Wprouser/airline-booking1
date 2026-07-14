import { ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { Select } from "./ui/Select";
import { cn } from "../lib/cn";
import type { FlightFilterState, SortKey, StopsFilter } from "../lib/flightFilters";

const SORT_LABELS: Record<SortKey, string> = {
  price: "Price (low to high)",
  duration: "Duration (shortest)",
  departure: "Departure time (earliest)",
  airline: "Airline (A–Z)",
};

const STOPS_LABELS: Record<StopsFilter, string> = { all: "All", nonstop: "Nonstop", "1stop": "1 stop" };

export function FlightFilterBar({
  state,
  onChange,
  airlineOptions,
}: {
  state: FlightFilterState;
  onChange: (next: FlightFilterState) => void;
  airlineOptions: { code: string; name: string }[];
}) {
  function toggleAirline(code: string) {
    const airlines = new Set(state.airlines);
    if (airlines.has(code)) airlines.delete(code);
    else airlines.add(code);
    onChange({ ...state, airlines });
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        Filter &amp; sort
      </div>

      <div className="flex min-w-[11rem] flex-1 items-center gap-2 sm:max-w-xs">
        <ArrowUpDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <Select
          aria-label="Sort by"
          value={state.sort}
          onChange={(e) => onChange({ ...state, sort: e.target.value as SortKey })}
        >
          {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold dark:bg-slate-800">
        {(Object.entries(STOPS_LABELS) as [StopsFilter, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange({ ...state, stops: key })}
            className={cn(
              "rounded-md px-2.5 py-1.5 transition-colors",
              state.stops === key
                ? "bg-white text-brand-700 shadow-soft dark:bg-slate-700 dark:text-brand-300"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {airlineOptions.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {airlineOptions.map((a) => {
            const active = state.airlines.has(a.code);
            return (
              <button
                key={a.code}
                type="button"
                onClick={() => toggleAirline(a.code)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-950/40 dark:text-brand-300"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800",
                )}
              >
                {a.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
