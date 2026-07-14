import { useNavigate } from "react-router-dom";
import { SearchX } from "lucide-react";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { formatDateTime, formatDuration, formatMoney, stopsLabel } from "../utils/format";
import { TRAVEL_CLASS_LABELS } from "../types";
import { Card, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

export function BookingSummaryPage() {
  const navigate = useNavigate();
  const {
    outboundFlight,
    returnFlight,
    travelClass,
    passengers,
    contactEmail,
    contactPhone,
    legsTotal,
    addonsTotal,
    grandTotal,
  } = useBookingDraftStore();

  if (!outboundFlight || passengers.length === 0) {
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

  const legs = [
    { legType: "outbound" as const, flight: outboundFlight },
    ...(returnFlight ? [{ legType: "return" as const, flight: returnFlight }] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl animate-slide-up">
      <WizardSteps current={6} />
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">Booking Summary</h1>

      <Card className="mb-6">
        <CardTitle>Itinerary — {TRAVEL_CLASS_LABELS[travelClass]}</CardTitle>
        {legs.map((leg, i) => (
          <div key={i} className="mb-3 border-b border-slate-100 pb-3 last:mb-0 last:border-0 last:pb-0 dark:border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {leg.legType === "outbound" ? "Outbound" : "Return"}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-100">
                  {leg.flight.airlineName} {leg.flight.flightNumber}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {leg.flight.originCode} → {leg.flight.destinationCode} · {formatDateTime(leg.flight.departureTime)} →{" "}
                  {formatDateTime(leg.flight.arrivalTime)}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDuration(leg.flight.durationMinutes)} · {stopsLabel(leg.flight.stops)} · {leg.flight.aircraft}
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {formatMoney(leg.flight.fare.price)}/pax
              </div>
            </div>
          </div>
        ))}
      </Card>

      <Card className="mb-6">
        <CardTitle>Passengers</CardTitle>
        {passengers.map((p, i) => (
          <div
            key={i}
            className="mb-3 border-b border-slate-100 pb-3 text-sm last:mb-0 last:border-0 last:pb-0 dark:border-slate-800"
          >
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {p.firstName} {p.lastName}
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              Seats: {legs.map((l, li) => `${l.legType} ${p.seatsByLeg[li] ?? "—"}`).join(" · ")}
            </div>
            {p.seatPreference && <div className="text-slate-500 dark:text-slate-400">Seat preference: {p.seatPreference}</div>}
            {p.specialMeal && <div className="text-slate-500 dark:text-slate-400">Meal request: {p.specialMeal}</div>}
            {p.addons.length > 0 && (
              <div className="text-slate-500 dark:text-slate-400">
                Add-ons: {p.addons.map((a) => `${a.description} (${formatMoney(a.price)})`).join(", ")}
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card className="mb-6">
        <CardTitle>Contact</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-300">{contactEmail}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">{contactPhone}</p>
      </Card>

      <Card className="mb-6 border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/40">
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
          <span>
            Fares ({passengers.length} passenger{passengers.length > 1 ? "s" : ""})
          </span>
          <span>{formatMoney(legsTotal())}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
          <span>Add-ons</span>
          <span>{formatMoney(addonsTotal())}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-brand-200 pt-2 text-lg font-bold text-brand-800 dark:border-brand-800 dark:text-brand-300">
          <span>Total</span>
          <span>{formatMoney(grandTotal())}</span>
        </div>
      </Card>

      <Button onClick={() => navigate("/booking/payment")} size="lg" className="w-full">
        Proceed to Payment
      </Button>
    </div>
  );
}
