import { useNavigate } from "react-router-dom";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { formatDateTime, formatDuration, formatMoney, stopsLabel } from "../utils/format";
import { TRAVEL_CLASS_LABELS } from "../types";

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
      <div className="mx-auto max-w-2xl text-center text-slate-500">
        <p>No booking in progress.</p>
        <button onClick={() => navigate("/")} className="mt-3 text-brand-600 underline">
          Start a new search
        </button>
      </div>
    );
  }

  const legs = [
    { legType: "outbound" as const, flight: outboundFlight },
    ...(returnFlight ? [{ legType: "return" as const, flight: returnFlight }] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <WizardSteps current={6} />
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Booking Summary</h1>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Itinerary — {TRAVEL_CLASS_LABELS[travelClass]}</h2>
        {legs.map((leg, i) => (
          <div key={i} className="mb-3 border-b border-slate-100 pb-3 last:mb-0 last:border-0 last:pb-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {leg.legType === "outbound" ? "Outbound" : "Return"}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">
                  {leg.flight.airlineName} {leg.flight.flightNumber}
                </div>
                <div className="text-sm text-slate-500">
                  {leg.flight.originCode} → {leg.flight.destinationCode} · {formatDateTime(leg.flight.departureTime)} →{" "}
                  {formatDateTime(leg.flight.arrivalTime)}
                </div>
                <div className="text-xs text-slate-400">
                  {formatDuration(leg.flight.durationMinutes)} · {stopsLabel(leg.flight.stops)} · {leg.flight.aircraft}
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-700">{formatMoney(leg.flight.fare.price)}/pax</div>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Passengers</h2>
        {passengers.map((p, i) => (
          <div key={i} className="mb-3 border-b border-slate-100 pb-3 text-sm last:mb-0 last:border-0 last:pb-0">
            <div className="font-semibold text-slate-800">
              {p.firstName} {p.lastName}
            </div>
            <div className="text-slate-500">
              Seats: {legs.map((l, li) => `${l.legType} ${p.seatsByLeg[li] ?? "—"}`).join(" · ")}
            </div>
            {p.seatPreference && <div className="text-slate-500">Seat preference: {p.seatPreference}</div>}
            {p.specialMeal && <div className="text-slate-500">Meal request: {p.specialMeal}</div>}
            {p.addons.length > 0 && (
              <div className="text-slate-500">
                Add-ons: {p.addons.map((a) => `${a.description} (${formatMoney(a.price)})`).join(", ")}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Contact</h2>
        <p className="text-sm text-slate-600">{contactEmail}</p>
        <p className="text-sm text-slate-600">{contactPhone}</p>
      </section>

      <section className="mb-6 rounded-lg border border-brand-200 bg-brand-50 p-4">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Fares ({passengers.length} passenger{passengers.length > 1 ? "s" : ""})</span>
          <span>{formatMoney(legsTotal())}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Add-ons</span>
          <span>{formatMoney(addonsTotal())}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-brand-200 pt-2 text-lg font-bold text-brand-800">
          <span>Total</span>
          <span>{formatMoney(grandTotal())}</span>
        </div>
      </section>

      <button
        onClick={() => navigate("/booking/payment")}
        className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Proceed to Payment
      </button>
    </div>
  );
}
