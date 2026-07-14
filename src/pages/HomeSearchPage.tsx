import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, CalendarDays, PlaneTakeoff, Search } from "lucide-react";
import { useSearchStore } from "../store/searchStore";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { AirportCombobox } from "../components/AirportCombobox";
import { PassengerSelector } from "../components/PassengerSelector";
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

function HeroBanner() {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 pb-24 pt-14 sm:pb-28 sm:pt-20">
      {/* Decorative aviation motif: a dashed flight path + soft glows — no external image asset. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          d="M -50 320 Q 300 200 600 260 T 1250 140"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="10 12"
        />
        <circle cx="150" cy="90" r="90" fill="white" opacity="0.06" />
        <circle cx="1050" cy="300" r="130" fill="white" opacity="0.05" />
        <circle cx="850" cy="60" r="50" fill="white" opacity="0.08" />
      </svg>
      <PlaneTakeoff
        className="pointer-events-none absolute -right-6 top-10 h-32 w-32 -rotate-6 text-white opacity-10 sm:h-44 sm:w-44"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-inset ring-white/20">
          <PlaneTakeoff className="h-3.5 w-3.5" aria-hidden="true" />
          Real airports · Live schedules
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Search. Compare. Fly.</h1>
        <p className="mt-2 text-sm text-brand-100 sm:text-base">
          Find and book flights across thousands of real routes worldwide.
        </p>
      </div>
    </div>
  );
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
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    loadAirports();
  }, [loadAirports]);

  function handleSwap() {
    if (!origin && !destination) return;
    setSwapping(true);
    setOrigin(destination);
    setDestination(origin);
    setTimeout(() => setSwapping(false), 300);
  }

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
    <div className="overflow-x-hidden">
      <HeroBanner />

      {/* relative + z-10: the hero above is a positioned element (needed for its full-bleed
          trick), and positioned elements paint above static ones regardless of DOM order — without
          this, the hero swallows clicks in the region the card overlaps it (via -mt-16/-mt-20). */}
      <div className="relative z-10 mx-auto -mt-16 max-w-3xl animate-slide-up px-0 sm:-mt-20">
        <Card className="shadow-elevated dark:shadow-elevated-dark">
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
              <div className="relative">
                <AirportCombobox
                  airports={airports}
                  value={origin}
                  onChange={setOrigin}
                  label="Source Airport"
                  placeholder="Search by city, code, or airport name"
                />
                <button
                  type="button"
                  onClick={handleSwap}
                  aria-label="Swap source and destination airports"
                  title="Swap airports"
                  className={cn(
                    "absolute left-1/2 top-8 z-10 hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-brand-600 shadow-soft transition-transform hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-brand-400 dark:hover:bg-slate-800 sm:left-full sm:top-8 sm:grid",
                    swapping && "rotate-180",
                  )}
                >
                  <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <AirportCombobox
                airports={airports}
                value={destination}
                onChange={setDestination}
                label="Destination Airport"
                placeholder="Search by city, code, or airport name"
              />
              <button
                type="button"
                onClick={handleSwap}
                aria-label="Swap source and destination airports"
                className={cn(
                  "-mt-2 flex w-fit items-center gap-1.5 self-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 shadow-soft transition-transform hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-brand-400 dark:hover:bg-slate-800 sm:hidden",
                  swapping && "rotate-180",
                )}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                Swap
              </button>

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

              <PassengerSelector value={passengers} onChange={setPassengers} />

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
    </div>
  );
}
