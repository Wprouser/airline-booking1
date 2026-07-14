import { Router } from "express";
import { pool, HttpError } from "../db/pool.js";
import { ensureFlightsForRoute } from "../lib/flightSync.js";
import { applyPromoToBreakdown, findGroupPromotion, type FareBreakdown, type GroupPromotion } from "../lib/farePricing.js";

export const flightsRouter = Router();

const TRAVEL_CLASSES = ["economy", "premium_economy", "business", "first"] as const;
type TravelClass = (typeof TRAVEL_CLASSES)[number];

function isTravelClass(value: unknown): value is TravelClass {
  return typeof value === "string" && (TRAVEL_CLASSES as readonly string[]).includes(value);
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const FLIGHT_SEARCH_SQL = `
  SELECT
    f.id, f.flight_number, f.origin_code, f.destination_code,
    f.departure_time, f.arrival_time, f.duration_minutes, f.stops, f.aircraft,
    al.code AS airline_code, al.name AS airline_name,
    ff.price, ff.total_seats, ff.booked_seats, ff.currency_code, ff.breakdown
  FROM flights f
  JOIN airlines al ON al.code = f.airline_code
  JOIN flight_fares ff ON ff.flight_id = f.id AND ff.travel_class = $4
  WHERE f.origin_code = $1
    AND f.destination_code = $2
    AND f.departure_date_local = $3::date
    AND (ff.total_seats - ff.booked_seats) >= $5
  ORDER BY f.departure_time ASC
`;

// `ff.breakdown` is the cached per-seat breakdown from calculateFare (Layer 1); `promo` is this
// request's live passenger-count discount (Layer 2, looked up once — see the /search handler).
function toFlightResult(row: Record<string, unknown>, promo: GroupPromotion | null) {
  const cached = row.breakdown as FareBreakdown;
  const breakdown = applyPromoToBreakdown(cached, promo);
  return {
    id: row.id,
    flightNumber: row.flight_number,
    airlineCode: row.airline_code,
    airlineName: row.airline_name,
    originCode: row.origin_code,
    destinationCode: row.destination_code,
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    durationMinutes: row.duration_minutes,
    stops: row.stops,
    aircraft: row.aircraft,
    fare: {
      price: breakdown.total,
      availableSeats: (row.total_seats as number) - (row.booked_seats as number),
      currency: row.currency_code,
      taxLabel: breakdown.taxLabel,
      breakdown,
    },
  };
}

// "Final Displayed Fare" logging — what actually goes out over the wire to the client, after the
// cached Layer 1 breakdown (calculateFare, logged in farePricing.ts) and the live Layer 2
// passenger-count discount (applyPromoToBreakdown) have both been applied.
function logFinalFares(label: string, flights: unknown[]): void {
  const prices = flights.map((f) => (f as { fare: { price: number; currency: string } }).fare);
  if (prices.length === 0) {
    console.log(`[flights/search] ${label}: final displayed fares — no results`);
    return;
  }
  const amounts = prices.map((p) => p.price);
  console.log(
    `[flights/search] ${label}: final displayed fares — ${prices.length} result(s), ` +
      `${prices[0].currency} ${Math.min(...amounts)}–${Math.max(...amounts)}`,
  );
}

flightsRouter.get("/search", async (req, res) => {
  const { origin, destination, departureDate, returnDate, passengers, travelClass } = req.query;

  if (typeof origin !== "string" || typeof destination !== "string" || !origin || !destination) {
    throw new HttpError(400, "origin and destination are required");
  }
  if (origin === destination) {
    throw new HttpError(400, "origin and destination must be different");
  }
  if (!isDateKey(departureDate)) {
    throw new HttpError(400, "departureDate must be in YYYY-MM-DD format");
  }
  if (returnDate !== undefined && !isDateKey(returnDate)) {
    throw new HttpError(400, "returnDate must be in YYYY-MM-DD format");
  }
  if (!isTravelClass(travelClass)) {
    throw new HttpError(400, "travelClass must be one of " + TRAVEL_CLASSES.join(", "));
  }
  const passengerCount = Number(passengers);
  if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 9) {
    throw new HttpError(400, "passengers must be an integer between 1 and 9");
  }

  console.log(
    `[flights/search] request: origin=${origin} destination=${destination} departureDate=${departureDate} ` +
      `returnDate=${returnDate ?? "-"} passengers=${passengerCount} travelClass=${travelClass}`,
  );

  // Looked up once and reused for every row below (outbound + return both share the same
  // passenger count/class) — this is the "recalculates when passenger count changes" behavior,
  // applied live on top of each flight's already-cached Layer 1 breakdown.
  const promo = await findGroupPromotion(pool, passengerCount, travelClass);

  await ensureFlightsForRoute(origin, destination, departureDate);
  const { rows: outboundRows } = await pool.query(FLIGHT_SEARCH_SQL, [
    origin,
    destination,
    departureDate,
    travelClass,
    passengerCount,
  ]);
  console.log(`[flights/search] outbound query returned ${outboundRows.length} row(s)`);

  const result: { outbound: unknown[]; return?: unknown[] } = {
    outbound: outboundRows.map((row) => toFlightResult(row, promo)),
  };
  logFinalFares("outbound", result.outbound);

  if (returnDate) {
    await ensureFlightsForRoute(destination, origin, returnDate);
    const { rows: returnRows } = await pool.query(FLIGHT_SEARCH_SQL, [
      destination,
      origin,
      returnDate,
      travelClass,
      passengerCount,
    ]);
    console.log(`[flights/search] return query returned ${returnRows.length} row(s)`);
    result.return = returnRows.map((row) => toFlightResult(row, promo));
    logFinalFares("return", result.return);
  }

  res.json(result);
});

flightsRouter.get("/:id", async (req, res) => {
  const { rows: flightRows } = await pool.query(
    `SELECT f.*, al.name AS airline_name FROM flights f
     JOIN airlines al ON al.code = f.airline_code
     WHERE f.id = $1`,
    [req.params.id],
  );
  const flight = flightRows[0];
  if (!flight) throw new HttpError(404, "Flight not found");

  const { rows: fares } = await pool.query(
    "SELECT travel_class, price, total_seats, booked_seats, currency_code, breakdown FROM flight_fares WHERE flight_id = $1",
    [req.params.id],
  );

  res.json({
    id: flight.id,
    flightNumber: flight.flight_number,
    airlineCode: flight.airline_code,
    airlineName: flight.airline_name,
    originCode: flight.origin_code,
    destinationCode: flight.destination_code,
    departureTime: flight.departure_time,
    arrivalTime: flight.arrival_time,
    durationMinutes: flight.duration_minutes,
    stops: flight.stops,
    aircraft: flight.aircraft,
    fares: fares.map((f) => ({
      travelClass: f.travel_class,
      price: f.price,
      availableSeats: f.total_seats - f.booked_seats,
      currency: f.currency_code,
      taxLabel: (f.breakdown as FareBreakdown | null)?.taxLabel,
      breakdown: f.breakdown,
    })),
  });
});

flightsRouter.get("/:id/seatmap", async (req, res) => {
  const { travelClass } = req.query;
  if (!isTravelClass(travelClass)) {
    throw new HttpError(400, "travelClass must be one of " + TRAVEL_CLASSES.join(", "));
  }
  const { rows } = await pool.query(
    "SELECT seat_number, is_booked FROM flight_seats WHERE flight_id = $1 AND travel_class = $2 ORDER BY seat_number",
    [req.params.id, travelClass],
  );
  if (rows.length === 0) throw new HttpError(404, "No seat map for this flight/class");
  res.json({
    travelClass,
    seats: rows.map((r) => ({ seatNumber: r.seat_number, isBooked: r.is_booked })),
  });
});
