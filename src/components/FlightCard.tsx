import { CheckCircle2, PlaneTakeoff } from "lucide-react";
import type { FlightResult } from "../types";
import { formatDuration, formatMoney, formatTime, stopsLabel } from "../utils/format";
import { Button } from "./ui/Button";
import { cn } from "../lib/cn";

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
        "flex flex-col gap-4 rounded-xl border p-4 shadow-soft transition-colors sm:flex-row sm:items-center sm:justify-between",
        selected
          ? "border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/40"
          : "border-slate-200 bg-white hover:border-brand-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800",
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <PlaneTakeoff className="h-4 w-4 text-brand-500" aria-hidden="true" />
          {flight.airlineName}
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{flight.flightNumber}</span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-slate-700 dark:text-slate-200">
          <div className="text-lg font-bold tabular-nums">{formatTime(flight.departureTime)}</div>
          <div className="flex flex-1 flex-col items-center px-2 text-xs text-slate-400 dark:text-slate-500">
            <div>{formatDuration(flight.durationMinutes)}</div>
            <div className="relative h-px w-full min-w-[3rem] bg-slate-300 dark:bg-slate-700">
              <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div>{stopsLabel(flight.stops)}</div>
          </div>
          <div className="text-lg font-bold tabular-nums">{formatTime(flight.arrivalTime)}</div>
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {flight.originCode} → {flight.destinationCode}
          </span>
          <span>{flight.aircraft}</span>
        </div>
      </div>
      <div className="flex flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:w-40 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <div className="flex flex-col sm:items-end">
          <div className="text-xs text-slate-500 dark:text-slate-400">{flight.fare.availableSeats} seats left</div>
          <div className="text-xl font-bold text-brand-700 dark:text-brand-400">{formatMoney(flight.fare.price)}</div>
        </div>
        <Button onClick={onSelect} className="w-full">
          {selected && <CheckCircle2 className="h-4 w-4" />}
          {selected ? "Selected" : "Select"}
        </Button>
      </div>
    </div>
  );
}
