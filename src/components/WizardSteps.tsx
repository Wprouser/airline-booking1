const STEPS = [
  "Search",
  "Select Flights",
  "Passenger Details",
  "Seat Selection",
  "Additional Services",
  "Summary",
  "Payment",
  "Confirmation",
];

export function WizardSteps({ current }: { current: number }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-x-1 gap-y-2 text-xs font-medium">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const state = step === current ? "current" : step < current ? "done" : "upcoming";
        return (
          <li key={label} className="flex items-center">
            <span
              className={
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 " +
                (state === "current"
                  ? "bg-brand-600 text-white"
                  : state === "done"
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-100 text-slate-400")
              }
            >
              <span className="grid h-4 w-4 place-items-center rounded-full bg-white/30 text-[10px]">
                {state === "done" ? "✓" : step}
              </span>
              {label}
            </span>
            {step < STEPS.length && <span className="mx-1 text-slate-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
