import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { synthesizeFaresAndSeats } from "./fareSynthesis.js";
import { FarePricingCache } from "./farePricing.js";

const AIRLINES = [
  { code: "SW", name: "SkyWays" },
  { code: "BJ", name: "BlueJet Airways" },
  { code: "FA", name: "Falcon Air" },
  { code: "HP", name: "Horizon Pacific Airlines" },
  { code: "CS", name: "Coastal Air" },
];

const AIRCRAFT = ["Airbus A320", "Boeing 737-800", "Boeing 787-9", "Airbus A321neo", "Embraer E190"];
const DEPARTURE_HOURS = [7, 13, 17, 21];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fallback used only when AERODATABOX_RAPIDAPI_KEY isn't configured, so `npm run dev` and demos
// keep working with zero setup. Production (with a real key) never calls this — see flightSync.ts.
export async function generateSimulatedFlights(
  client: PoolClient,
  origin: string,
  destination: string,
  dateKey: string,
): Promise<void> {
  await client.query(
    `INSERT INTO airlines (code, name)
     VALUES ${AIRLINES.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ")}
     ON CONFLICT (code) DO NOTHING`,
    AIRLINES.flatMap((a) => [a.code, a.name]),
  );

  const flightCount = Math.random() < 0.5 ? 2 : 3;
  const hours = [...DEPARTURE_HOURS].sort(() => Math.random() - 0.5).slice(0, flightCount);
  const pricingCache = new FarePricingCache();

  for (const hour of hours) {
    const airline = rand(AIRLINES);
    const hasStop = Math.random() < 0.15;
    const stops = hasStop ? 1 : 0;
    const durationMinutes = 90 + Math.floor(Math.random() * 270) + (hasStop ? 55 : 0);
    const flightNumber = `${airline.code}${100 + Math.floor(Math.random() * 900)}`;

    const departure = new Date(`${dateKey}T00:00:00.000Z`);
    departure.setUTCHours(hour, rand([0, 15, 30, 45]), 0, 0);
    const arrival = new Date(departure.getTime() + durationMinutes * 60_000);
    const id = `sim-${flightNumber}-${origin}${destination}-${dateKey}-${randomUUID().slice(0, 8)}`;

    await client.query(
      `INSERT INTO flights (id, flight_number, airline_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, stops, aircraft, source, departure_date_local)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'simulated', $11)`,
      [
        id,
        flightNumber,
        airline.code,
        origin,
        destination,
        departure.toISOString(),
        arrival.toISOString(),
        durationMinutes,
        stops,
        rand(AIRCRAFT),
        dateKey,
      ],
    );

    await synthesizeFaresAndSeats(
      client,
      id,
      durationMinutes,
      { originCode: origin, destinationCode: destination, airlineCode: airline.code, departureDateLocal: dateKey },
      pricingCache,
    );
  }
}
