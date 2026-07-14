import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchX, UserCircle2 } from "lucide-react";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { Card, CardTitle } from "../components/ui/Card";
import { FormField } from "../components/ui/FormField";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { EmptyState } from "../components/ui/EmptyState";

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
      <div className="mx-auto max-w-2xl animate-fade-in">
        <EmptyState
          icon={SearchX}
          title="No flights selected yet"
          action={<Button onClick={() => navigate("/")}>Start a new search</Button>}
        />
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
    <div className="mx-auto max-w-3xl animate-slide-up">
      <WizardSteps current={3} />
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">Passenger Details</h1>

      <Card className="mb-6">
        <CardTitle>Contact Information</CardTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Email" required>
            {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
          </FormField>
          <FormField label="Phone" required>
            {(id) => <Input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />}
          </FormField>
        </div>
      </Card>

      {passengers.map((p, i) => (
        <Card key={i} className="mb-6">
          <CardTitle className="flex items-center gap-1.5">
            <UserCircle2 className="h-4 w-4 text-brand-500" aria-hidden="true" />
            Passenger {i + 1}
          </CardTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="First Name" required>
              {(id) => (
                <Input id={id} value={p.firstName} onChange={(e) => updatePassenger(i, { firstName: e.target.value })} required />
              )}
            </FormField>
            <FormField label="Last Name" required>
              {(id) => (
                <Input id={id} value={p.lastName} onChange={(e) => updatePassenger(i, { lastName: e.target.value })} required />
              )}
            </FormField>
            <FormField label="Date of Birth">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={p.dateOfBirth}
                  onChange={(e) => updatePassenger(i, { dateOfBirth: e.target.value })}
                />
              )}
            </FormField>
            <FormField label="Gender">
              {(id) => (
                <Select id={id} value={p.gender} onChange={(e) => updatePassenger(i, { gender: e.target.value })}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              )}
            </FormField>
            <FormField label="Passport / Government ID" hint="Optional">
              {(id) => (
                <Input
                  id={id}
                  value={p.passportNumber}
                  onChange={(e) => updatePassenger(i, { passportNumber: e.target.value })}
                />
              )}
            </FormField>
            <FormField label="Nationality" hint="Optional">
              {(id) => (
                <Input id={id} value={p.nationality} onChange={(e) => updatePassenger(i, { nationality: e.target.value })} />
              )}
            </FormField>
            <FormField label="Special Meal Request">
              {(id) => (
                <Select
                  id={id}
                  value={p.specialMeal}
                  onChange={(e) => updatePassenger(i, { specialMeal: e.target.value })}
                >
                  {MEAL_OPTIONS.map((m) => (
                    <option key={m} value={m === "None" ? "" : m}>
                      {m}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label="Seat Preference">
              {(id) => (
                <Select
                  id={id}
                  value={p.seatPreference}
                  onChange={(e) => updatePassenger(i, { seatPreference: e.target.value })}
                >
                  {SEAT_PREFERENCES.map((s) => (
                    <option key={s} value={s === "No preference" ? "" : s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>
        </Card>
      ))}

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <Button onClick={handleContinue} size="lg" className="w-full">
        Continue to Seat Selection
      </Button>
    </div>
  );
}
