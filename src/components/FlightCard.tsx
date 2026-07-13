import type { FlightResult } from "../types";
import { formatDuration, formatMoney, formatTime, stopsLabel } from "../utils/format";

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
      className={
        "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between " +
        (selected ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white")
      }
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {flight.airlineName}
          <span className="text-xs font-normal text-slate-400">{flight.flightNumber}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-slate-700">
          <div className="text-lg font-bold">{formatTime(flight.departureTime)}</div>
          <div className="flex flex-1 flex-col items-center px-2 text-xs text-slate-400">
            <div>{formatDuration(flight.durationMinutes)}</div>
            <div className="h-px w-full min-w-[3rem] bg-slate-300" />
            <div>{stopsLabel(flight.stops)}</div>
          </div>
          <div className="text-lg font-bold">{formatTime(flight.arrivalTime)}</div>
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>
            {flight.originCode} → {flight.destinationCode}
          </span>
          <span>{flight.aircraft}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 sm:w-40">
        <div className="text-xs text-slate-500">{flight.fare.availableSeats} seats left</div>
        <div className="text-xl font-bold text-brand-700">{formatMoney(flight.fare.price)}</div>
        <button
          onClick={onSelect}
          className={
            "w-full rounded-md px-3 py-2 text-sm font-semibold " +
            (selected ? "bg-brand-700 text-white" : "bg-brand-600 text-white hover:bg-brand-700")
          }
        >
          {selected ? "Selected" : "Select"}
        </button>
      </div>
    </div>
  );
}
