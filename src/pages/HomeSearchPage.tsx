import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Search, Users } from "lucide-react";
import { useSearchStore } from "../store/searchStore";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { AirportCombobox } from "../components/AirportCombobox";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { FormField } from "../components/ui/FormField";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { cn } from "../lib/cn";
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
    <div className="mx-auto max-w-3xl animate-slide-up">
      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Search Flights</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Search real airports worldwide for live flight schedules.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="inline-flex w-fit rounded-lg bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
            {(["round_trip", "one_way"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTripType(t)}
                className={cn(
                  "rounded-md px-4 py-1.5 transition-colors",
                  tripType === t
                    ? "bg-white text-brand-700 shadow-soft dark:bg-slate-700 dark:text-brand-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                {t === "round_trip" ? "Round trip" : "One way"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AirportCombobox
              airports={airports}
              value={origin}
              onChange={setOrigin}
              label="Source Airport"
              placeholder="Search by city, code, or airport name"
            />
            <AirportCombobox
              airports={airports}
              value={destination}
              onChange={setDestination}
              label="Destination Airport"
              placeholder="Search by city, code, or airport name"
            />

            <FormField label="Departure Date" required>
              {(id) => (
                <div className="relative">
                  <CalendarDays
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id={id}
                    type="date"
                    min={todayKey()}
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              )}
            </FormField>

            <FormField
              label="Return Date"
              hint={tripType === "one_way" ? "Round trip only" : undefined}
              required={tripType === "round_trip"}
            >
              {(id) => (
                <div className="relative">
                  <CalendarDays
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id={id}
                    type="date"
                    min={departureDate}
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    disabled={tripType === "one_way"}
                    className="pl-9"
                    required={tripType === "round_trip"}
                  />
                </div>
              )}
            </FormField>

            <FormField label="Number of Passengers" required>
              {(id) => (
                <div className="relative">
                  <Users
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id={id}
                    type="number"
                    min={1}
                    max={9}
                    value={passengers}
                    onChange={(e) => setPassengers(Math.min(9, Math.max(1, Number(e.target.value))))}
                    className="pl-9"
                    required
                  />
                </div>
              )}
            </FormField>

            <FormField label="Travel Class">
              {(id) => (
                <Select id={id} value={travelClass} onChange={(e) => setTravelClass(e.target.value as TravelClass)}>
                  {Object.entries(TRAVEL_CLASS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>

          {(formError || error) && <Alert variant="error">{formError ?? error}</Alert>}

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {!submitting && <Search className="h-4 w-4" />}
            {submitting ? "Searching…" : "Search Flights"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
