import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useBookingsStore } from "../store/bookingsStore";
import { ApiError } from "../utils/api";
import { formatDateTime, formatMoney } from "../utils/format";
import { buildETicketHtml, buildInvoiceHtml, downloadHtml } from "../utils/document";
import { TRAVEL_CLASS_LABELS, type BookingDetail } from "../types";

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchDetail, cancelBooking } = useBookingsStore();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    fetchDetail(id)
      .then(setBooking)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load booking"));
  }, [id, fetchDetail]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel() {
    if (!id || !confirm(`Cancel booking ${id}? This cannot be undone.`)) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelBooking(id);
      load();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel booking");
    } finally {
      setCancelling(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-red-600">{error}</p>
        <button onClick={() => navigate("/my-bookings")} className="mt-3 text-brand-600 underline">
          Back to My Bookings
        </button>
      </div>
    );
  }
  if (!booking) return <p className="mx-auto max-w-2xl text-center text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Booking <span className="font-mono text-brand-700">{booking.id}</span>
        </h1>
        <span
          className={
            "rounded-full px-3 py-1 text-xs font-semibold " +
            (booking.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500")
          }
        >
          {booking.status}
        </span>
      </div>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Flights</h2>
        {booking.legs.map((leg) => (
          <div key={leg.id} className="mb-3 border-b border-slate-100 pb-3 text-sm last:mb-0 last:border-0 last:pb-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {leg.legType === "outbound" ? "Outbound" : "Return"}
            </div>
            <div className="font-semibold text-slate-800">
              {leg.airlineName} {leg.flightNumber} · {TRAVEL_CLASS_LABELS[leg.travelClass]}
            </div>
            <div className="text-slate-500">
              {leg.originCode} → {leg.destinationCode} · {formatDateTime(leg.departureTime)} → {formatDateTime(leg.arrivalTime)}
            </div>
            <div className="text-slate-400">{formatMoney(leg.farePrice)} per passenger</div>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Passengers</h2>
        {booking.passengers.map((p) => (
          <div key={p.id} className="mb-3 border-b border-slate-100 pb-3 text-sm last:mb-0 last:border-0 last:pb-0">
            <div className="font-semibold text-slate-800">
              {p.firstName} {p.lastName}
            </div>
            <div className="text-slate-500">Seats: {p.seats.map((s) => s.seatNumber).join(", ") || "—"}</div>
            {p.seatPreference && <div className="text-slate-500">Seat preference: {p.seatPreference}</div>}
            {p.specialMeal && <div className="text-slate-500">Meal request: {p.specialMeal}</div>}
            {p.passportNumber && <div className="text-slate-500">Passport/ID: {p.passportNumber}</div>}
            {p.addons.length > 0 && (
              <div className="text-slate-500">
                Add-ons: {p.addons.map((a) => `${a.description} (${formatMoney(a.price)})`).join(", ")}
              </div>
            )}
          </div>
        ))}
        <div className="mt-2 text-lg font-bold text-slate-800">Total Paid: {formatMoney(booking.totalAmount)}</div>
      </section>

      {booking.payment && (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Payment</h2>
          {booking.payment.method.toUpperCase()} ending in {booking.payment.cardLast4} · Ref: {booking.payment.transactionRef}
        </section>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => downloadHtml(`e-ticket-${booking.id}.html`, buildETicketHtml(booking))}
          className="flex-1 rounded-md border border-brand-300 bg-white py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          Download E-Ticket
        </button>
        <button
          onClick={() => downloadHtml(`receipt-${booking.id}.html`, buildInvoiceHtml(booking))}
          className="flex-1 rounded-md border border-brand-300 bg-white py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          Download Receipt / Invoice
        </button>
      </div>

      {booking.status === "confirmed" && (
        <div>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full rounded-md border border-red-300 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel Booking"}
          </button>
          {cancelError && <p className="mt-2 text-sm text-red-600">{cancelError}</p>}
        </div>
      )}

      <Link to="/my-bookings" className="mt-4 block text-center text-sm text-brand-600 underline">
        Back to My Bookings
      </Link>
    </div>
  );
}
