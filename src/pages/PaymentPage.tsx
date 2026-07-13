import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingDraftStore } from "../store/bookingDraftStore";
import { WizardSteps } from "../components/WizardSteps";
import { apiFetch, ApiError } from "../utils/api";
import { formatMoney } from "../utils/format";
import type { BookingDetail } from "../types";

export function PaymentPage() {
  const navigate = useNavigate();
  const draft = useBookingDraftStore();
  const { outboundFlight, returnFlight, travelClass, tripType, passengers, contactEmail, contactPhone, payment, setPayment, grandTotal, reset } =
    draft;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="mx-auto max-w-2xl">
      <WizardSteps current={7} />
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Payment</h1>
      <p className="mb-4 text-sm text-slate-500">
        This is a dummy payment gateway for demo purposes — no real charge is made. Card{" "}
        <code className="rounded bg-slate-100 px-1">4000 0000 0000 0002</code> always declines.
      </p>

      <form onSubmit={handlePay} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex gap-4 text-sm font-medium">
          {(["card", "upi", "wallet"] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5 capitalize">
              <input type="radio" checked={payment.method === m} onChange={() => setPayment({ ...payment, method: m })} />
              {m}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Name on Card</label>
            <input
              value={payment.nameOnCard}
              onChange={(e) => setPayment({ ...payment, nameOnCard: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Card Number</label>
            <input
              inputMode="numeric"
              placeholder="4111 1111 1111 1111"
              value={payment.cardNumber}
              onChange={(e) => setPayment({ ...payment, cardNumber: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Expiry (MM/YY)</label>
              <input
                placeholder="12/28"
                value={payment.expiry}
                onChange={(e) => setPayment({ ...payment, expiry: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">CVV</label>
              <input
                inputMode="numeric"
                placeholder="123"
                value={payment.cvv}
                onChange={(e) => setPayment({ ...payment, cvv: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Processing payment…" : `Pay ${formatMoney(grandTotal())}`}
        </button>
      </form>
    </div>
  );
}
