import { CheckCircle2, ChevronDown, PlaneTakeoff } from "lucide-react";
import type { FlightResult } from "../types";
import { formatDuration, formatMoney, formatTime, stopsLabel } from "../utils/format";
import { Button } from "./ui/Button";
import { FareBreakdownDetails } from "./FareBreakdownDetails";
import { cn } from "../lib/cn";

// No real airline-logo assets or free logo API exist for arbitrary IATA codes — a deterministic
// colored initial badge stands in for one instead of fabricating real branding.
const BADGE_COLORS = [
  "bg-brand-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-violet-600",
  "bg-cyan-600",
  "bg-orange-600",
  "bg-teal-600",
];

function badgeColor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

function AirlineBadge({ code }: { code: string }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
        badgeColor(code),
      )}
      aria-hidden="true"
    >
      {code.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function FlightCard({
  flight,
  onSelect,
  selected,
}: {
  flight: FlightResult;
  onSelect: () => void;
  selected?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 shadow-soft transition-colors",
        selected
          ? "border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/40"
          : "border-slate-200 bg-white hover:border-brand-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-start gap-3">
          <AirlineBadge code={flight.airlineCode} />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {flight.airlineName}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{flight.flightNumber}</span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-slate-700 dark:text-slate-200">
              <div className="text-left">
                <div className="text-lg font-bold tabular-nums">{formatTime(flight.departureTime)}</div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{flight.originCode}</div>
              </div>
              <div className="flex flex-1 flex-col items-center px-2 text-xs text-slate-400 dark:text-slate-500">
                <div>{formatDuration(flight.durationMinutes)}</div>
                <div className="relative flex h-px w-full min-w-[3rem] items-center bg-slate-300 dark:bg-slate-700">
                  <span className="absolute left-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <PlaneTakeoff className="mx-auto h-3 w-3 rotate-90 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <span className="absolute right-0 h-1.5 w-1.5 translate-x-1/2 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
                <div>{stopsLabel(flight.stops)}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums">{formatTime(flight.arrivalTime)}</div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{flight.destinationCode}</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{flight.aircraft}</div>
          </div>
        </div>
        <div className="flex flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:w-40 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <div className="flex flex-col sm:items-end">
            <div className="text-xs text-slate-500 dark:text-slate-400">{flight.fare.availableSeats} seats left</div>
            <div className="text-xl font-bold text-brand-700 dark:text-brand-400">
              {formatMoney(flight.fare.price, flight.fare.currency)}
            </div>
          </div>
          <Button onClick={onSelect} className="w-full">
            {selected && <CheckCircle2 className="h-4 w-4" />}
            {selected ? "Selected" : "Book Now"}
          </Button>
        </div>
      </div>

      <details className="group border-t border-slate-100 pt-3 dark:border-slate-800">
        <summary className="flex w-fit cursor-pointer select-none list-none items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Fare details
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-2 max-w-sm">
          <FareBreakdownDetails breakdown={flight.fare.breakdown} />
        </div>
      </details>
    </div>
  );
}
