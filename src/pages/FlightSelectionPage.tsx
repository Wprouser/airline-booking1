import { useNavigate } from "react-router-dom";
import { useSearchStore } from "../store/searchStore";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { FlightCard } from "../components/FlightCard";

export function FlightSelectionPage() {
  const navigate = useNavigate();
  const { outbound, returnFlights, criteria, loading } = useSearchStore();
  const { tripType, outboundFlight, returnFlight, selectOutbound, selectReturn } = useBookingDraftStore();

  if (!criteria) {
    return (
      <div className="mx-auto max-w-2xl text-center text-slate-500">
        <p>Start by searching for flights.</p>
        <button onClick={() => navigate("/")} className="mt-3 text-brand-600 underline">
          Go to search
        </button>
      </div>
    );
  }

  const needsReturn = tripType === "round_trip";
  const readyToContinue = !!outboundFlight && (!needsReturn || !!returnFlight);

  return (
    <div className="mx-auto max-w-3xl">
      <WizardSteps current={2} />
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Select Your Flights</h1>

      {loading && <p className="text-sm text-slate-500">Loading flights…</p>}

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Outbound: {criteria.origin} → {criteria.destination} ({criteria.departureDate})
        </h2>
        {outbound.length === 0 && !loading ? (
          <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
            No flights found for this route/date/class combination.
          </p>
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
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Return: {criteria.destination} → {criteria.origin} ({criteria.returnDate})
          </h2>
          {returnFlights.length === 0 && !loading ? (
            <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
              No return flights found for this route/date/class combination.
            </p>
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

      <button
        disabled={!readyToContinue}
        onClick={() => navigate("/booking/passengers")}
        className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue to Passenger Details
      </button>
    </div>
  );
}
