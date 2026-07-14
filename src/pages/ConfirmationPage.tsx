import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PartyPopper, Ticket } from "lucide-react";
import { useBookingsStore } from "../store/bookingsStore";
import { WizardSteps } from "../components/WizardSteps";
import { formatDateTime, formatMoney } from "../utils/format";
import { buildETicketHtml, buildInvoiceHtml, downloadHtml } from "../utils/document";
import { TRAVEL_CLASS_LABELS, type BookingDetail } from "../types";
import { Card, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Skeleton } from "../components/ui/Skeleton";

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

  if (error) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl animate-fade-in">
        <Skeleton className="mb-6 h-32 w-full rounded-xl" />
        <Skeleton className="mb-6 h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-slide-up">
      <WizardSteps current={8} />

      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-soft dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
          <PartyPopper className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-3 text-2xl font-bold text-emerald-800 dark:text-emerald-300">Booking Confirmed!</h1>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
          Your booking reference (PNR) is
          <span className="ml-2 rounded bg-white px-2 py-1 font-mono text-lg font-bold tracking-widest text-emerald-800 dark:bg-slate-900 dark:text-emerald-300">
            {booking.id}
          </span>
        </p>
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
          </div>
        ))}
      </Card>

      <Card className="mb-6">
        <CardTitle>Passengers & Seats</CardTitle>
        {booking.passengers.map((p) => (
          <div key={p.id} className="mb-2 text-sm text-slate-600 dark:text-slate-300">
            {p.firstName} {p.lastName} — {p.seats.map((s) => s.seatNumber).join(", ") || "seat pending"}
          </div>
        ))}
        <div className="mt-3 border-t border-slate-100 pt-3 text-lg font-bold text-slate-800 dark:border-slate-800 dark:text-white">
          Total Paid: {formatMoney(booking.totalAmount, booking.legs[0]?.currency ?? "USD")}
        </div>
      </Card>

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

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to="/my-bookings" className="flex-1">
          <Button className="w-full">View My Bookings</Button>
        </Link>
        <Link to="/" className="flex-1">
          <Button variant="secondary" className="w-full">
            Book Another Flight
          </Button>
        </Link>
      </div>
    </div>
  );
}
