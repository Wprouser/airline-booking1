import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX2, PlaneTakeoff } from "lucide-react";
import { useBookingsStore } from "../store/bookingsStore";
import { ApiError } from "../utils/api";
import { formatDateTime, formatMoney } from "../utils/format";
import type { BookingSummary } from "../types";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

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
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-sm font-bold tracking-wider text-brand-700 dark:text-brand-400">{booking.id}</div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <PlaneTakeoff className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {booking.firstLegOrigin} → {booking.firstLegDestination}
            {booking.tripType === "round_trip" ? " (round trip)" : ""}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">{formatDateTime(booking.firstLegDeparture)}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {formatMoney(booking.totalAmount, booking.currency)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">{booking.passengerCount} passenger(s)</div>
          <Badge variant={booking.status === "confirmed" ? "success" : "neutral"} className="mt-1">
            {booking.status}
          </Badge>
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        <Link to={`/bookings/${booking.id}`} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
          View Details
        </Link>
        {showCancel && booking.status === "confirmed" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
          >
            {cancelling ? "Cancelling…" : "Cancel Booking"}
          </button>
        )}
      </div>
      {cancelError && (
        <div className="mt-2">
          <Alert variant="error">{cancelError}</Alert>
        </div>
      )}
    </Card>
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
    <div className="mx-auto max-w-3xl animate-slide-up">
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">My Bookings</h1>

      {loading && mine.length === 0 && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}
      {!loading && mine.length === 0 && (
        <EmptyState
          icon={CalendarX2}
          title="You have no bookings yet"
          action={
            <Link to="/">
              <Button>Search for a flight</Button>
            </Link>
          }
        />
      )}

      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Upcoming</h2>
          <div className="flex flex-col gap-3">
            {upcoming.map((b) => (
              <BookingRow key={b.id} booking={b} showCancel />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Past</h2>
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
