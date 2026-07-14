import { useNavigate } from "react-router-dom";
import { PlaneTakeoff, SearchX } from "lucide-react";
import { useSearchStore } from "../store/searchStore";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { FlightCard } from "../components/FlightCard";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { FlightCardSkeleton } from "../components/ui/Skeleton";

export function FlightSelectionPage() {
  const navigate = useNavigate();
  const { outbound, returnFlights, criteria, loading } = useSearchStore();
  const { tripType, outboundFlight, returnFlight, selectOutbound, selectReturn } = useBookingDraftStore();

  if (!criteria) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <EmptyState
          icon={SearchX}
          title="Start by searching for flights"
          action={<Button onClick={() => navigate("/")}>Go to search</Button>}
        />
      </div>
    );
  }

  const needsReturn = tripType === "round_trip";
  const readyToContinue = !!outboundFlight && (!needsReturn || !!returnFlight);

  return (
    <div className="mx-auto max-w-3xl animate-slide-up">
      <WizardSteps current={2} />
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">Select Your Flights</h1>

      <section className="mb-8">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <PlaneTakeoff className="h-4 w-4" aria-hidden="true" />
          Outbound: {criteria.origin} → {criteria.destination} ({criteria.departureDate})
        </h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            <FlightCardSkeleton />
            <FlightCardSkeleton />
          </div>
        ) : outbound.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No nonstop flights found"
            description="No flights matched this route, date, and class combination. Try a different date or class."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {outbound.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                selected={outboundFlight?.id === flight.id}
                onSelect={() => selectOutbound(flight)}
              />
            ))}
          </div>
        )}
      </section>

      {needsReturn && (
        <section className="mb-8">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <PlaneTakeoff className="h-4 w-4 -scale-x-100" aria-hidden="true" />
            Return: {criteria.destination} → {criteria.origin} ({criteria.returnDate})
          </h2>
          {loading ? (
            <div className="flex flex-col gap-3">
              <FlightCardSkeleton />
              <FlightCardSkeleton />
            </div>
          ) : returnFlights.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No nonstop return flights found"
              description="No return flights matched this route, date, and class combination."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {returnFlights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  selected={returnFlight?.id === flight.id}
                  onSelect={() => selectReturn(flight)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <Button
        disabled={!readyToContinue}
        onClick={() => navigate("/booking/passengers")}
        size="lg"
        className="w-full"
      >
        Continue to Passenger Details
      </Button>
    </div>
  );
}
