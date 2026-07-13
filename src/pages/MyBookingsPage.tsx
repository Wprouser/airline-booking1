import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBookingsStore } from "../store/bookingsStore";
import { ApiError } from "../utils/api";
import { formatDateTime, formatMoney } from "../utils/format";
import type { BookingSummary } from "../types";

function BookingRow({ booking, showCancel }: { booking: BookingSummary; showCancel: boolean }) {
  const cancelBooking = useBookingsStore((s) => s.cancelBooking);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (!confirm(`Cancel booking ${booking.id}? This cannot be undone.`)) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelBooking(booking.id);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel booking");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-sm font-bold tracking-wider text-brand-700">{booking.id}</div>
          <div className="text-sm text-slate-600">
            {booking.firstLegOrigin} → {booking.firstLegDestination}
            {booking.tripType === "round_trip" ? " (round trip)" : ""}
          </div>
          <div className="text-xs text-slate-400">{formatDateTime(booking.firstLegDeparture)}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-800">{formatMoney(booking.totalAmount)}</div>
          <div className="text-xs text-slate-400">{booking.passengerCount} passenger(s)</div>
          <span
            className={
              "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold " +
              (booking.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500")
            }
          >
            {booking.status}
          </span>
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        <Link to={`/bookings/${booking.id}`} className="text-sm font-semibold text-brand-600 hover:underline">
          View Details
        </Link>
        {showCancel && booking.status === "confirmed" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel Booking"}
          </button>
        )}
      </div>
      {cancelError && <p className="mt-2 text-sm text-red-600">{cancelError}</p>}
    </div>
  );
}

export function MyBookingsPage() {
  const { mine, loading, fetchMine } = useBookingsStore();

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  const now = Date.now();
  const upcoming = mine.filter((b) => new Date(b.firstLegDeparture).getTime() >= now);
  const past = mine.filter((b) => new Date(b.firstLegDeparture).getTime() < now);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">My Bookings</h1>

      {loading && mine.length === 0 && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && mine.length === 0 && (
        <p className="rounded-md bg-slate-50 p-6 text-center text-sm text-slate-500">
          You have no bookings yet. <Link to="/" className="text-brand-600 underline">Search for a flight</Link>.
        </p>
      )}

      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Upcoming</h2>
          <div className="flex flex-col gap-3">
            {upcoming.map((b) => (
              <BookingRow key={b.id} booking={b} showCancel />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Past</h2>
          <div className="flex flex-col gap-3">
            {past.map((b) => (
              <BookingRow key={b.id} booking={b} showCancel={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
