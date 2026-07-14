import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchX } from "lucide-react";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { SeatMapGrid } from "../components/SeatMapGrid";
import { apiFetch } from "../utils/api";
import type { SeatMapResponse } from "../types";
import { TRAVEL_CLASS_LABELS } from "../types";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";

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
      <div className="mx-auto max-w-2xl animate-fade-in">
        <EmptyState
          icon={SearchX}
          title="No booking in progress"
          action={<Button onClick={() => navigate("/")}>Start a new search</Button>}
        />
      </div>
    );
  }

  const allSeatsAssigned = passengers.every((p) => legs.every((_, legIdx) => !!p.seatsByLeg[legIdx]));

  return (
    <div className="mx-auto max-w-3xl animate-slide-up">
      <WizardSteps current={4} />
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">Seat Selection</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Choose which passenger you're assigning, then tap a seat on the map. {TRAVEL_CLASS_LABELS[travelClass]} cabin.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {passengers.map((p, i) => (
          <button
            key={i}
            onClick={() => setActivePassenger(i)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              activePassenger === i
                ? "bg-brand-600 text-white shadow-soft dark:bg-brand-500"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            )}
          >
            {p.firstName || `Passenger ${i + 1}`} {p.lastName}
            {legs.map((_, legIdx) => (p.seatsByLeg[legIdx] ? ` · ${p.seatsByLeg[legIdx]}` : ""))}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="mb-4">
          <Alert variant="error">{loadError}</Alert>
        </div>
      )}

      {legs.map((leg, legIdx) => {
        const seatMap = seatMaps[legIdx];
        const activeSeatsThisLeg = passengers
          .map((p, i) => (i === activePassenger ? null : p.seatsByLeg[legIdx]))
          .filter((s): s is string => !!s);
        return (
          <div key={legIdx} className="mb-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {leg.legType === "outbound" ? "Outbound" : "Return"}: {leg.flight.originCode} → {leg.flight.destinationCode}{" "}
              ({leg.flight.flightNumber})
            </h2>
            {!seatMap ? (
              <Skeleton className="h-48 w-full max-w-md" />
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

      <Button disabled={!allSeatsAssigned} onClick={() => navigate("/booking/services")} size="lg" className="w-full">
        Continue to Additional Services
      </Button>
    </div>
  );
}
