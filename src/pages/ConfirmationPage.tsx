import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useBookingsStore } from "../store/bookingsStore";
import { WizardSteps } from "../components/WizardSteps";
import { formatDateTime, formatMoney } from "../utils/format";
import { buildETicketHtml, buildInvoiceHtml, downloadHtml } from "../utils/document";
import { TRAVEL_CLASS_LABELS, type BookingDetail } from "../types";

export function ConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const fetchDetail = useBookingsStore((s) => s.fetchDetail);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchDetail(id)
      .then(setBooking)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load booking"));
  }, [id, fetchDetail]);

  if (error) return <p className="mx-auto max-w-2xl text-center text-red-600">{error}</p>;
  if (!booking) return <p className="mx-auto max-w-2xl text-center text-slate-500">Loading confirmation…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <WizardSteps current={8} />

      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="text-3xl">🎉</div>
        <h1 className="mt-2 text-2xl font-bold text-emerald-800">Booking Confirmed!</h1>
        <p className="mt-1 text-sm text-emerald-700">
          Your booking reference (PNR) is
          <span className="ml-2 rounded bg-white px-2 py-1 font-mono text-lg font-bold tracking-widest text-emerald-800">
            {booking.id}
          </span>
        </p>
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
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Passengers & Seats</h2>
        {booking.passengers.map((p) => (
          <div key={p.id} className="mb-2 text-sm text-slate-600">
            {p.firstName} {p.lastName} —{" "}
            {p.seats.map((s) => s.seatNumber).join(", ") || "seat pending"}
          </div>
        ))}
        <div className="mt-3 border-t border-slate-100 pt-3 text-lg font-bold text-slate-800">
          Total Paid: {formatMoney(booking.totalAmount)}
        </div>
      </section>

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

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/my-bookings"
          className="flex-1 rounded-md bg-brand-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
        >
          View My Bookings
        </Link>
        <Link
          to="/"
          className="flex-1 rounded-md border border-slate-300 py-2.5 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Book Another Flight
        </Link>
      </div>
    </div>
  );
}
