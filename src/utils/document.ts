import type { BookingDetail } from "../types";
import { TRAVEL_CLASS_LABELS } from "../types";
import { formatDateTime, formatMoney } from "./format";

export function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pageShell(title: string, body: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; margin-bottom: 0.25rem; }
  .pnr { font-size: 1.1rem; font-weight: 700; color: #1c46e0; letter-spacing: 0.08em; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; }
  th { color: #64748b; font-weight: 600; }
  .section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-top: 1.5rem; }
  .total { font-size: 1.2rem; font-weight: 700; text-align: right; margin-top: 1rem; }
  .footer { margin-top: 2rem; font-size: 0.75rem; color: #94a3b8; }
</style>
</head>
<body>
${body}
<p class="footer">SkyBook · This is a demo document generated for a dummy booking, not a real travel document.</p>
</body>
</html>`;
}

export function buildETicketHtml(booking: BookingDetail): string {
  const legsHtml = booking.legs
    .map(
      (leg) => `
    <div class="section-title">${leg.legType === "outbound" ? "Outbound" : "Return"} Flight</div>
    <table>
      <tr><th>Airline</th><td>${leg.airlineName} (${leg.flightNumber})</td></tr>
      <tr><th>Route</th><td>${leg.originCode} &rarr; ${leg.destinationCode}</td></tr>
      <tr><th>Departure</th><td>${formatDateTime(leg.departureTime)}</td></tr>
      <tr><th>Arrival</th><td>${formatDateTime(leg.arrivalTime)}</td></tr>
      <tr><th>Class</th><td>${TRAVEL_CLASS_LABELS[leg.travelClass]}</td></tr>
    </table>
    <table>
      <tr><th>Passenger</th><th>Seat</th></tr>
      ${booking.passengers
        .map((p) => {
          const seat = p.seats.find((s) => s.bookingLegId === leg.id);
          return `<tr><td>${p.firstName} ${p.lastName}</td><td>${seat?.seatNumber ?? "—"}</td></tr>`;
        })
        .join("")}
    </table>`,
    )
    .join("");

  return pageShell(
    `E-Ticket ${booking.id}`,
    `
    <h1>E-Ticket</h1>
    <div class="pnr">PNR: ${booking.id}</div>
    <p>Status: ${booking.status === "confirmed" ? "Confirmed" : "Cancelled"}</p>
    ${legsHtml}
    <div class="section-title">Contact</div>
    <p>${booking.contactEmail} · ${booking.contactPhone}</p>
  `,
  );
}

export function buildInvoiceHtml(booking: BookingDetail): string {
  const fareRows = booking.legs
    .map(
      (leg) =>
        `<tr><td>${leg.legType === "outbound" ? "Outbound" : "Return"} — ${leg.airlineName} ${leg.flightNumber} (${leg.originCode}→${leg.destinationCode})</td><td>${TRAVEL_CLASS_LABELS[leg.travelClass]}</td><td>${formatMoney(leg.farePrice)} × ${booking.passengers.length}</td></tr>`,
    )
    .join("");

  const addonRows = booking.passengers
    .flatMap((p) => p.addons.map((a) => `<tr><td>${p.firstName} ${p.lastName} — ${a.description}</td><td></td><td>${formatMoney(a.price)}</td></tr>`))
    .join("");

  return pageShell(
    `Invoice ${booking.id}`,
    `
    <h1>Receipt / Invoice</h1>
    <div class="pnr">Booking Reference: ${booking.id}</div>
    <p>Issued: ${formatDateTime(booking.createdAt)}</p>
    <table>
      <tr><th>Item</th><th>Class</th><th>Amount</th></tr>
      ${fareRows}
      ${addonRows}
    </table>
    <div class="total">Total Paid: ${formatMoney(booking.totalAmount)}</div>
    ${
      booking.payment
        ? `<div class="section-title">Payment</div><p>${booking.payment.method.toUpperCase()} ending in ${booking.payment.cardLast4} · Ref: ${booking.payment.transactionRef} · Status: ${booking.payment.status}</p>`
        : ""
    }
    <div class="section-title">Billed To</div>
    <p>${booking.contactEmail} · ${booking.contactPhone}</p>
  `,
  );
}
