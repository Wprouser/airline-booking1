import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Ticket } from "lucide-react";
import { useBookingsStore } from "../store/bookingsStore";
import { ApiError } from "../utils/api";
import { formatDateTime, formatMoney } from "../utils/format";
import { buildETicketHtml, buildInvoiceHtml, downloadHtml } from "../utils/document";
import { TRAVEL_CLASS_LABELS, type BookingDetail } from "../types";
import { Card, CardTitle } from "../components/ui/Card";
import { FareBreakdownDetails } from "../components/FareBreakdownDetails";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Skeleton } from "../components/ui/Skeleton";

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
      <div className="mx-auto max-w-2xl animate-fade-in">
        <Alert variant="error">{error}</Alert>
        <Button variant="ghost" className="mt-3" onClick={() => navigate("/my-bookings")}>
          Back to My Bookings
        </Button>
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl animate-fade-in">
        <Skeleton className="mb-6 h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const currency = booking.legs[0]?.currency ?? "USD";

  return (
    <div className="mx-auto max-w-3xl animate-slide-up">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Booking <span className="font-mono text-brand-700 dark:text-brand-400">{booking.id}</span>
        </h1>
        <Badge variant={booking.status === "confirmed" ? "success" : "neutral"}>{booking.status}</Badge>
      </div>

      <Card className="mb-6">
        <CardTitle>Flights</CardTitle>
        {booking.legs.map((leg) => (
          <div key={leg.id} className="mb-3 border-b border-slate-100 pb-3 text-sm last:mb-0 last:border-0 last:pb-0 dark:border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {leg.legType === "outbound" ? "Outbound" : "Return"}
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {leg.airlineName} {leg.flightNumber} · {TRAVEL_CLASS_LABELS[leg.travelClass]}
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              {leg.originCode} → {leg.destinationCode} · {formatDateTime(leg.departureTime)} → {formatDateTime(leg.arrivalTime)}
            </div>
            <div className="text-slate-400 dark:text-slate-500">{formatMoney(leg.farePrice, leg.currency)} per passenger</div>
            {leg.breakdown && (
              <details className="group mt-2">
                <summary className="flex w-fit cursor-pointer select-none list-none items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                  Fare details
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mt-2 max-w-sm">
                  <FareBreakdownDetails breakdown={leg.breakdown} />
                </div>
              </details>
            )}
          </div>
        ))}
      </Card>

      <Card className="mb-6">
        <CardTitle>Passengers</CardTitle>
        {booking.passengers.map((p) => (
          <div key={p.id} className="mb-3 border-b border-slate-100 pb-3 text-sm last:mb-0 last:border-0 last:pb-0 dark:border-slate-800">
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {p.firstName} {p.lastName}
            </div>
            <div className="text-slate-500 dark:text-slate-400">Seats: {p.seats.map((s) => s.seatNumber).join(", ") || "—"}</div>
            {p.seatPreference && <div className="text-slate-500 dark:text-slate-400">Seat preference: {p.seatPreference}</div>}
            {p.specialMeal && <div className="text-slate-500 dark:text-slate-400">Meal request: {p.specialMeal}</div>}
            {p.passportNumber && <div className="text-slate-500 dark:text-slate-400">Passport/ID: {p.passportNumber}</div>}
            {p.addons.length > 0 && (
              <div className="text-slate-500 dark:text-slate-400">
                Add-ons: {p.addons.map((a) => `${a.description} (${formatMoney(a.price, currency)})`).join(", ")}
              </div>
            )}
          </div>
        ))}
        <div className="mt-2 text-lg font-bold text-slate-800 dark:text-white">
          Total Paid: {formatMoney(booking.totalAmount, currency)}
        </div>
      </Card>

      {booking.payment && (
        <Card className="mb-6 text-sm text-slate-600 dark:text-slate-300">
          <CardTitle>Payment</CardTitle>
          {booking.payment.method.toUpperCase()} ending in {booking.payment.cardLast4} · Ref: {booking.payment.transactionRef}
        </Card>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => downloadHtml(`e-ticket-${booking.id}.html`, buildETicketHtml(booking))}
        >
          <Ticket className="h-4 w-4" /> Download E-Ticket
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => downloadHtml(`receipt-${booking.id}.html`, buildInvoiceHtml(booking))}
        >
          Download Receipt / Invoice
        </Button>
      </div>

      {booking.status === "confirmed" && (
        <div>
          <Button variant="danger" loading={cancelling} onClick={handleCancel} className="w-full">
            {cancelling ? "Cancelling…" : "Cancel Booking"}
          </Button>
          {cancelError && (
            <div className="mt-2">
              <Alert variant="error">{cancelError}</Alert>
            </div>
          )}
        </div>
      )}

      <Link
        to="/my-bookings"
        className="mt-4 block text-center text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
      >
        Back to My Bookings
      </Link>
    </div>
  );
}
