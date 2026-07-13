import "dotenv/config";
import { pool } from "./pool.js";
import type { PoolClient } from "pg";

type TravelClass = "economy" | "premium_economy" | "business" | "first";

const AIRPORTS = [
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "USA" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "USA" },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "USA" },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International", city: "Atlanta", country: "USA" },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "USA" },
  { code: "MIA", name: "Miami International", city: "Miami", country: "USA" },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "USA" },
  { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", country: "USA" },
];

const AIRLINES = [
  { code: "SW", name: "SkyWays" },
  { code: "BJ", name: "BlueJet Airways" },
  { code: "FA", name: "Falcon Air" },
  { code: "HP", name: "Horizon Pacific Airlines" },
  { code: "CS", name: "Coastal Air" },
];

// Undirected route pairs with a rough nonstop duration in minutes. Both directions are
// generated from each pair.
const ROUTE_PAIRS: [string, string, number][] = [
  ["JFK", "LAX", 360],
  ["JFK", "ORD", 150],
  ["JFK", "MIA", 190],
  ["JFK", "SFO", 390],
  ["LAX", "ORD", 240],
  ["LAX", "SEA", 150],
  ["LAX", "DFW", 195],
  ["ORD", "ATL", 120],
  ["ATL", "MIA", 130],
  ["SFO", "SEA", 130],
  ["DFW", "MIA", 165],
  ["ORD", "SFO", 240],
  ["ATL", "DFW", 150],
  ["SEA", "JFK", 330],
  ["MIA", "LAX", 320],
];

const AIRCRAFT = ["Airbus A320", "Boeing 737-800", "Boeing 787-9", "Airbus A321neo", "Embraer E190"];

const DAYS_AHEAD = 10;
const DEPARTURE_HOURS = [7, 13, 17, 21];

function seatLetters(count: number): string[] {
  return ["A", "B", "C", "D", "E", "F"].slice(0, count);
}

function seatsForClass(travelClass: TravelClass): string[] {
  switch (travelClass) {
    case "first":
      return [1, 2].flatMap((row) => ["A", "C", "D", "F"].map((l) => `${row}${l}`));
    case "business":
      return [3, 4, 5].flatMap((row) => ["A", "C", "D", "F"].map((l) => `${row}${l}`));
    case "premium_economy":
      return [7, 8, 9].flatMap((row) => seatLetters(6).map((l) => `${row}${l}`));
    case "economy":
      return Array.from({ length: 10 }, (_, i) => i + 10).flatMap((row) =>
        seatLetters(6).map((l) => `${row}${l}`),
      );
  }
}

const FARE_MULTIPLIER: Record<TravelClass, number> = {
  economy: 1,
  premium_economy: 1.6,
  business: 3.2,
  first: 5.5,
};

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function insertBatch(
  client: PoolClient,
  table: string,
  columns: string[],
  rows: unknown[][],
  batchSize = 800,
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values: unknown[] = [];
    const placeholders = chunk
      .map((row, rowIdx) => {
        const base = rowIdx * columns.length;
        values.push(...row);
        return `(${columns.map((_, colIdx) => `$${base + colIdx + 1}`).join(", ")})`;
      })
      .join(", ");
    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`,
      values,
    );
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("Resetting flight inventory + reference data (bookings cascade too)...");
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE bookings, flight_seats, flight_fares, flights, airlines, airports RESTART IDENTITY CASCADE",
    );

    await insertBatch(
      client,
      "airports",
      ["code", "name", "city", "country"],
      AIRPORTS.map((a) => [a.code, a.name, a.city, a.country]),
    );
    await insertBatch(
      client,
      "airlines",
      ["code", "name"],
      AIRLINES.map((a) => [a.code, a.name]),
    );

    const directedRoutes: { origin: string; destination: string; duration: number }[] = [];
    for (const [a, b, duration] of ROUTE_PAIRS) {
      directedRoutes.push({ origin: a, destination: b, duration });
      directedRoutes.push({ origin: b, destination: a, duration });
    }

    const flightRows: unknown[][] = [];
    const fareRows: unknown[][] = [];
    const seatRows: unknown[][] = [];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const route of directedRoutes) {
      for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
        // 2-3 flights/day on this route, at distinct times.
        const flightsToday = Math.random() < 0.5 ? 2 : 3;
        const hours = [...DEPARTURE_HOURS].sort(() => Math.random() - 0.5).slice(0, flightsToday);

        for (const hour of hours) {
          const airline = rand(AIRLINES);
          const hasStop = Math.random() < 0.15;
          const stops = hasStop ? 1 : 0;
          const durationMinutes = route.duration + (hasStop ? 55 : 0);
          const flightNumber = `${airline.code}${100 + Math.floor(Math.random() * 900)}`;

          const departure = new Date(today);
          departure.setUTCDate(departure.getUTCDate() + dayOffset);
          departure.setUTCHours(hour, rand([0, 15, 30, 45]), 0, 0);
          const arrival = new Date(departure.getTime() + durationMinutes * 60_000);

          // Include an incrementing counter, not just flightNumber+route+date: two flights on
          // the same route/day can independently randomize to the same flightNumber, and that
          // alone previously caused primary-key collisions within a single seed run.
          const id = `${flightNumber}-${route.origin}${route.destination}-${departure.toISOString().slice(0, 10)}-${flightRows.length}`;

          flightRows.push([
            id,
            flightNumber,
            airline.code,
            route.origin,
            route.destination,
            departure.toISOString(),
            arrival.toISOString(),
            durationMinutes,
            stops,
            rand(AIRCRAFT),
          ]);

          const basePrice = route.duration * 0.42 + 35;
          for (const travelClass of ["economy", "premium_economy", "business", "first"] as TravelClass[]) {
            const seats = seatsForClass(travelClass);
            const price = Math.round(basePrice * FARE_MULTIPLIER[travelClass] * (0.9 + Math.random() * 0.3));
            fareRows.push([id, travelClass, price, seats.length, 0]);
            for (const seatNumber of seats) {
              seatRows.push([id, travelClass, seatNumber, false]);
            }
          }
        }
      }
    }

    console.log(`Inserting ${flightRows.length} flights...`);
    await insertBatch(
      client,
      "flights",
      [
        "id",
        "flight_number",
        "airline_code",
        "origin_code",
        "destination_code",
        "departure_time",
        "arrival_time",
        "duration_minutes",
        "stops",
        "aircraft",
      ],
      flightRows,
    );

    console.log(`Inserting ${fareRows.length} fare rows...`);
    await insertBatch(
      client,
      "flight_fares",
      ["flight_id", "travel_class", "price", "total_seats", "booked_seats"],
      fareRows,
    );

    console.log(`Inserting ${seatRows.length} seat rows...`);
    await insertBatch(
      client,
      "flight_seats",
      ["flight_id", "travel_class", "seat_number", "is_booked"],
      seatRows,
    );

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
