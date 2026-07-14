import { Router } from "express";
import { pool, HttpError } from "../db/pool.js";
import { ensureFlightsForRoute } from "../lib/flightSync.js";

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
    ff.price, ff.total_seats, ff.booked_seats
  FROM flights f
  JOIN airlines al ON al.code = f.airline_code
  JOIN flight_fares ff ON ff.flight_id = f.id AND ff.travel_class = $4
  WHERE f.origin_code = $1
    AND f.destination_code = $2
    AND f.departure_date_local = $3::date
    AND (ff.total_seats - ff.booked_seats) >= $5
  ORDER BY f.departure_time ASC
`;

function toFlightResult(row: Record<string, unknown>) {
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
      price: row.price,
      availableSeats: (row.total_seats as number) - (row.booked_seats as number),
    },
  };
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
    outbound: outboundRows.map(toFlightResult),
  };

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
    result.return = returnRows.map(toFlightResult);
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
    "SELECT travel_class, price, total_seats, booked_seats FROM flight_fares WHERE flight_id = $1",
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
