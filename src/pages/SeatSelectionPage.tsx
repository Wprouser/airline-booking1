import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { SeatMapGrid } from "../components/SeatMapGrid";
import { apiFetch } from "../utils/api";
import type { SeatMapResponse } from "../types";
import { TRAVEL_CLASS_LABELS } from "../types";

export function SeatSelectionPage() {
  const navigate = useNavigate();
  const { outboundFlight, returnFlight, travelClass, passengers, setSeat } = useBookingDraftStore();
  const [activePassenger, setActivePassenger] = useState(0);
  const [seatMaps, setSeatMaps] = useState<Record<number, SeatMapResponse | null>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const legs = useMemo(
    () =>
      [
        outboundFlight ? { legType: "outbound" as const, flight: outboundFlight } : null,
        returnFlight ? { legType: "return" as const, flight: returnFlight } : null,
      ].filter((l): l is { legType: "outbound" | "return"; flight: NonNullable<typeof outboundFlight> } => !!l),
    [outboundFlight, returnFlight],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError(null);
      try {
        const results = await Promise.all(
          legs.map((leg) =>
            apiFetch<SeatMapResponse>(`/api/flights/${leg.flight.id}/seatmap?travelClass=${travelClass}`),
          ),
        );
        if (!cancelled) {
          const map: Record<number, SeatMapResponse | null> = {};
          results.forEach((r, i) => (map[i] = r));
          setSeatMaps(map);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load seat map");
      }
    }
    if (legs.length > 0) load();
    return () => {
      cancelled = true;
    };
  }, [legs, travelClass]);

  if (legs.length === 0 || passengers.length === 0) {
    return (
      <div className="mx-auto max-w-2xl text-center text-slate-500">
        <p>No booking in progress.</p>
        <button onClick={() => navigate("/")} className="mt-3 text-brand-600 underline">
          Start a new search
        </button>
      </div>
    );
  }

  const allSeatsAssigned = passengers.every((p) => legs.every((_, legIdx) => !!p.seatsByLeg[legIdx]));

  return (
    <div className="mx-auto max-w-3xl">
      <WizardSteps current={4} />
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Seat Selection</h1>
      <p className="mb-4 text-sm text-slate-500">
        Choose which passenger you're assigning, then tap a seat on the map. {TRAVEL_CLASS_LABELS[travelClass]} cabin.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {passengers.map((p, i) => (
          <button
            key={i}
            onClick={() => setActivePassenger(i)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-semibold " +
              (activePassenger === i ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
            }
          >
            {p.firstName || `Passenger ${i + 1}`} {p.lastName}
            {legs.map((_, legIdx) => (p.seatsByLeg[legIdx] ? ` · ${p.seatsByLeg[legIdx]}` : ""))}
          </button>
        ))}
      </div>

      {loadError && <p className="mb-4 text-sm text-red-600">{loadError}</p>}

      {legs.map((leg, legIdx) => {
        const seatMap = seatMaps[legIdx];
        const activeSeatsThisLeg = passengers
          .map((p, i) => (i === activePassenger ? null : p.seatsByLeg[legIdx]))
          .filter((s): s is string => !!s);
        return (
          <div key={legIdx} className="mb-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {leg.legType === "outbound" ? "Outbound" : "Return"}: {leg.flight.originCode} → {leg.flight.destinationCode}{" "}
              ({leg.flight.flightNumber})
            </h2>
            {!seatMap ? (
              <p className="text-sm text-slate-400">Loading seat map…</p>
            ) : (
              <SeatMapGrid
                seats={seatMap.seats}
                selectedSeat={passengers[activePassenger]?.seatsByLeg[legIdx] ?? null}
                takenByOthersInDraft={new Set(activeSeatsThisLeg)}
                onSelect={(seatNumber) => setSeat(activePassenger, legIdx, seatNumber)}
              />
            )}
          </div>
        );
      })}

      <button
        disabled={!allSeatsAssigned}
        onClick={() => navigate("/booking/services")}
        className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue to Additional Services
      </button>
    </div>
  );
}
