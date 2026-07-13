import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";

const SEAT_PREFERENCES = ["No preference", "Window", "Aisle", "Middle"];
const MEAL_OPTIONS = ["None", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free", "Diabetic"];

export function PassengerDetailsPage() {
  const navigate = useNavigate();
  const { outboundFlight, passengers, ensurePassengerCount, updatePassenger, contactEmail, contactPhone, setContact } =
    useBookingDraftStore();
  const [email, setEmail] = useState(contactEmail);
  const [phone, setPhone] = useState(contactPhone);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensurePassengerCount();
  }, [ensurePassengerCount]);

  if (!outboundFlight) {
    return (
      <div className="mx-auto max-w-2xl text-center text-slate-500">
        <p>No flights selected yet.</p>
        <button onClick={() => navigate("/")} className="mt-3 text-brand-600 underline">
          Start a new search
        </button>
      </div>
    );
  }

  function handleContinue() {
    setError(null);
    if (!email.includes("@")) {
      setError("Please enter a valid contact email.");
      return;
    }
    if (phone.trim().length < 7) {
      setError("Please enter a valid contact phone number.");
      return;
    }
    for (const [i, p] of passengers.entries()) {
      if (!p.firstName.trim() || !p.lastName.trim()) {
        setError(`Please enter first and last name for passenger ${i + 1}.`);
        return;
      }
    }
    setContact(email, phone);
    navigate("/booking/seats");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <WizardSteps current={3} />
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Passenger Details</h1>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Contact Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
        </div>
      </div>

      {passengers.map((p, i) => (
        <div key={i} className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Passenger {i + 1}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">First Name</label>
              <input
                value={p.firstName}
                onChange={(e) => updatePassenger(i, { firstName: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Last Name</label>
              <input
                value={p.lastName}
                onChange={(e) => updatePassenger(i, { lastName: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Date of Birth</label>
              <input
                type="date"
                value={p.dateOfBirth}
                onChange={(e) => updatePassenger(i, { dateOfBirth: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Gender</label>
              <select
                value={p.gender}
                onChange={(e) => updatePassenger(i, { gender: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Passport / Government ID <span className="text-slate-400">(optional)</span>
              </label>
              <input
                value={p.passportNumber}
                onChange={(e) => updatePassenger(i, { passportNumber: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Nationality <span className="text-slate-400">(optional)</span>
              </label>
              <input
                value={p.nationality}
                onChange={(e) => updatePassenger(i, { nationality: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Special Meal Request</label>
              <select
                value={p.specialMeal}
                onChange={(e) => updatePassenger(i, { specialMeal: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {MEAL_OPTIONS.map((m) => (
                  <option key={m} value={m === "None" ? "" : m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Seat Preference</label>
              <select
                value={p.seatPreference}
                onChange={(e) => updatePassenger(i, { seatPreference: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {SEAT_PREFERENCES.map((s) => (
                  <option key={s} value={s === "No preference" ? "" : s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleContinue}
        className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Continue to Seat Selection
      </button>
    </div>
  );
}
