import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { formatMoney } from "../utils/format";
import type { AddonInput } from "../types";

const MEAL_ADDONS: AddonInput[] = [
  { addonType: "meal", description: "Standard Meal (included)", price: 0 },
  { addonType: "meal", description: "Premium Meal Upgrade", price: 15 },
  { addonType: "meal", description: "Chef's Special Tasting Menu", price: 22 },
];

const BAGGAGE_ADDONS: AddonInput[] = [
  { addonType: "baggage", description: "No extra baggage", price: 0 },
  { addonType: "baggage", description: "+1 Checked Bag (23kg)", price: 35 },
  { addonType: "baggage", description: "+2 Checked Bags (23kg each)", price: 65 },
  { addonType: "baggage", description: "Extra Oversized/Sports Bag", price: 50 },
];

export function AdditionalServicesPage() {
  const navigate = useNavigate();
  const { outboundFlight, passengers, setAddons } = useBookingDraftStore();

  const [selections, setSelections] = useState(() =>
    passengers.map((p) => ({
      meal: p.addons.find((a) => a.addonType === "meal")?.description ?? MEAL_ADDONS[0].description,
      baggage: p.addons.find((a) => a.addonType === "baggage")?.description ?? BAGGAGE_ADDONS[0].description,
    })),
  );

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

  function handleContinue() {
    selections.forEach((sel, i) => {
      const addons: AddonInput[] = [];
      const meal = MEAL_ADDONS.find((m) => m.description === sel.meal);
      const baggage = BAGGAGE_ADDONS.find((b) => b.description === sel.baggage);
      if (meal && meal.price > 0) addons.push(meal);
      if (baggage && baggage.price > 0) addons.push(baggage);
      setAddons(i, addons);
    });
    navigate("/booking/summary");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <WizardSteps current={5} />
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Additional Services</h1>

      {passengers.map((p, i) => (
        <div key={i} className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            {p.firstName || `Passenger ${i + 1}`} {p.lastName}
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Meal</h3>
              <div className="flex flex-col gap-2">
                {MEAL_ADDONS.map((m) => (
                  <label key={m.description} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`meal-${i}`}
                        checked={selections[i].meal === m.description}
                        onChange={() =>
                          setSelections((s) => s.map((x, xi) => (xi === i ? { ...x, meal: m.description } : x)))
                        }
                      />
                      {m.description}
                    </span>
                    <span className="text-slate-500">{m.price > 0 ? formatMoney(m.price) : "Free"}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Baggage</h3>
              <div className="flex flex-col gap-2">
                {BAGGAGE_ADDONS.map((b) => (
                  <label key={b.description} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`baggage-${i}`}
                        checked={selections[i].baggage === b.description}
                        onChange={() =>
                          setSelections((s) => s.map((x, xi) => (xi === i ? { ...x, baggage: b.description } : x)))
                        }
                      />
                      {b.description}
                    </span>
                    <span className="text-slate-500">{b.price > 0 ? formatMoney(b.price) : "Free"}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={handleContinue}
        className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Continue to Booking Summary
      </button>
    </div>
  );
}
