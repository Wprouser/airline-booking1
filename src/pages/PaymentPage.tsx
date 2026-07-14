import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Lock, SearchX } from "lucide-react";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { apiFetch, ApiError } from "../utils/api";
import { formatMoney } from "../utils/format";
import type { BookingDetail } from "../types";
import { Card } from "../components/ui/Card";
import { FormField } from "../components/ui/FormField";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { EmptyState } from "../components/ui/EmptyState";
import { cn } from "../lib/cn";

export function PaymentPage() {
  const navigate = useNavigate();
  const draft = useBookingDraftStore();
  const { outboundFlight, returnFlight, travelClass, tripType, passengers, contactEmail, contactPhone, payment, setPayment, grandTotal, reset } =
    draft;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const legs = [
        { flightId: outboundFlight!.id, travelClass, legType: "outbound" as const },
        ...(returnFlight ? [{ flightId: returnFlight.id, travelClass, legType: "return" as const }] : []),
      ];
      const body = {
        tripType,
        contactEmail,
        contactPhone,
        legs,
        passengers: passengers.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth || null,
          gender: p.gender || null,
          passportNumber: p.passportNumber || null,
          nationality: p.nationality || null,
          specialMeal: p.specialMeal || null,
          seatPreference: p.seatPreference || null,
          seatsByLeg: p.seatsByLeg,
          addons: p.addons,
        })),
        payment,
      };
      const booking = await apiFetch<BookingDetail>("/api/bookings", {
        method: "POST",
        body: JSON.stringify(body),
      });
      reset();
      navigate(`/booking/confirmation/${booking.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Payment could not be processed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-slide-up">
      <WizardSteps current={7} />
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">Payment</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        This is a dummy payment gateway for demo purposes — no real charge is made. Card{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">4000 0000 0000 0002</code> always declines.
      </p>

      <Card>
        <form onSubmit={handlePay} className="flex flex-col gap-5">
          <div className="inline-flex w-fit rounded-lg bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
            {(["card", "upi", "wallet"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPayment({ ...payment, method: m })}
                className={cn(
                  "rounded-md px-4 py-1.5 capitalize transition-colors",
                  payment.method === m
                    ? "bg-white text-brand-700 shadow-soft dark:bg-slate-700 dark:text-brand-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FormField label="Name on Card" required>
              {(id) => (
                <Input
                  id={id}
                  value={payment.nameOnCard}
                  onChange={(e) => setPayment({ ...payment, nameOnCard: e.target.value })}
                  required
                />
              )}
            </FormField>
            <FormField label="Card Number" required>
              {(id) => (
                <div className="relative">
                  <CreditCard
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id={id}
                    inputMode="numeric"
                    placeholder="4111 1111 1111 1111"
                    value={payment.cardNumber}
                    onChange={(e) => setPayment({ ...payment, cardNumber: e.target.value })}
                    className="pl-9"
                    required
                  />
                </div>
              )}
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Expiry (MM/YY)" required>
                {(id) => (
                  <Input
                    id={id}
                    placeholder="12/28"
                    value={payment.expiry}
                    onChange={(e) => setPayment({ ...payment, expiry: e.target.value })}
                    required
                  />
                )}
              </FormField>
              <FormField label="CVV" required>
                {(id) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    placeholder="123"
                    value={payment.cvv}
                    onChange={(e) => setPayment({ ...payment, cvv: e.target.value })}
                    required
                  />
                )}
              </FormField>
            </div>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {!submitting && <Lock className="h-4 w-4" />}
            {submitting ? "Processing payment…" : `Pay ${formatMoney(grandTotal(), outboundFlight.fare.currency)}`}
          </Button>
        </form>
      </Card>
    </div>
  );
}
