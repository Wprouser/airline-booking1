import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "../store/searchStore";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import type { TravelClass } from "../types";
import { TRAVEL_CLASS_LABELS } from "../types";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HomeSearchPage() {
  const navigate = useNavigate();
  const { airports, loadAirports, search, error } = useSearchStore();
  const setTripDetails = useBookingDraftStore((s) => s.setTripDetails);

  const [tripType, setTripType] = useState<"one_way" | "round_trip">("round_trip");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState(todayKey());
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [travelClass, setTravelClass] = useState<TravelClass>("economy");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadAirports();
  }, [loadAirports]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!origin || !destination) {
      setFormError("Please choose both a source and destination airport.");
      return;
    }
    if (origin === destination) {
      setFormError("Source and destination airports must be different.");
      return;
    }
    if (tripType === "round_trip" && (!returnDate || returnDate < departureDate)) {
      setFormError("Please choose a valid return date on or after the departure date.");
      return;
    }

    setSubmitting(true);
    try {
      await search({
        origin,
        destination,
        departureDate,
        returnDate: tripType === "round_trip" ? returnDate : "",
        passengers,
        travelClass,
      });
      setTripDetails(tripType, travelClass, passengers);
      navigate("/booking/select");
    } catch {
      // error surfaced via store
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Search Flights</h1>
      <p className="mb-6 text-sm text-slate-500">Search real-time-style availability across our demo route network.</p>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex gap-4 text-sm font-medium">
          {(["round_trip", "one_way"] as const).map((t) => (
            <label key={t} className="flex items-center gap-1.5">
              <input type="radio" checked={tripType === t} onChange={() => setTripType(t)} />
              {t === "round_trip" ? "Round trip" : "One way"}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Source Airport</label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select origin</option>
              {airports.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.city} ({a.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Destination Airport</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select destination</option>
              {airports.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.city} ({a.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Departure Date</label>
            <input
              type="date"
              min={todayKey()}
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Return Date {tripType === "one_way" && <span className="text-slate-400">(round trip only)</span>}
            </label>
            <input
              type="date"
              min={departureDate}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              disabled={tripType === "one_way"}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              required={tripType === "round_trip"}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Number of Passengers</label>
            <input
              type="number"
              min={1}
              max={9}
              value={passengers}
              onChange={(e) => setPassengers(Math.min(9, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Travel Class</label>
            <select
              value={travelClass}
              onChange={(e) => setTravelClass(e.target.value as TravelClass)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {Object.entries(TRAVEL_CLASS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(formError || error) && <p className="mt-4 text-sm text-red-600">{formError ?? error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Searching…" : "Search Flights"}
        </button>
      </form>
    </div>
  );
}
