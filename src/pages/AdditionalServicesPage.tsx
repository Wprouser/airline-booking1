import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchX, Utensils, Luggage } from "lucide-react";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { formatMoney } from "../utils/format";
import type { AddonInput } from "../types";
import { Card, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { cn } from "../lib/cn";

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

function AddonOption({
  name,
  checked,
  onChange,
  label,
  price,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  price: number;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
        checked
          ? "border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/40"
          : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50",
      )}
    >
      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
        <input type="radio" name={name} checked={checked} onChange={onChange} className="accent-brand-600" />
        {label}
      </span>
      <span className="font-medium text-slate-500 dark:text-slate-400">{price > 0 ? formatMoney(price) : "Free"}</span>
    </label>
  );
}

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
      <div className="mx-auto max-w-2xl animate-fade-in">
        <EmptyState
          icon={SearchX}
          title="No booking in progress"
          action={<Button onClick={() => navigate("/")}>Start a new search</Button>}
        />
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
    <div className="mx-auto max-w-3xl animate-slide-up">
      <WizardSteps current={5} />
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">Additional Services</h1>

      {passengers.map((p, i) => (
        <Card key={i} className="mb-6">
          <CardTitle>
            {p.firstName || `Passenger ${i + 1}`} {p.lastName}
          </CardTitle>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Utensils className="h-3.5 w-3.5" aria-hidden="true" /> Meal
              </h3>
              <div className="flex flex-col gap-2">
                {MEAL_ADDONS.map((m) => (
                  <AddonOption
                    key={m.description}
                    name={`meal-${i}`}
                    label={m.description}
                    price={m.price}
                    checked={selections[i].meal === m.description}
                    onChange={() => setSelections((s) => s.map((x, xi) => (xi === i ? { ...x, meal: m.description } : x)))}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Luggage className="h-3.5 w-3.5" aria-hidden="true" /> Baggage
              </h3>
              <div className="flex flex-col gap-2">
                {BAGGAGE_ADDONS.map((b) => (
                  <AddonOption
                    key={b.description}
                    name={`baggage-${i}`}
                    label={b.description}
                    price={b.price}
                    checked={selections[i].baggage === b.description}
                    onChange={() =>
                      setSelections((s) => s.map((x, xi) => (xi === i ? { ...x, baggage: b.description } : x)))
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}

      <Button onClick={handleContinue} size="lg" className="w-full">
        Continue to Booking Summary
      </Button>
    </div>
  );
}
