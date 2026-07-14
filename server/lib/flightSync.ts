import { pool, withTransaction, HttpError } from "../db/pool.js";
import { AERODATABOX_RAPIDAPI_KEY } from "../config.js";
import { fetchLiveFlightsForRoute, type LiveFlightLeg } from "./aerodatabox.js";
import { generateSimulatedFlights } from "./simulatedFlights.js";
import { synthesizeFaresAndSeats } from "./fareSynthesis.js";

const CACHE_TTL_HOURS = 12;

function durationMinutesBetween(depUtc: string, arrUtc: string): number {
  return Math.max(30, Math.round((new Date(arrUtc).getTime() - new Date(depUtc).getTime()) / 60_000));
}

async function isCacheFresh(origin: string, destination: string, dateKey: string): Promise<boolean> {
  const { rows } = await pool.query<{ fetched_at: string }>(
    `SELECT fetched_at FROM route_cache WHERE origin_code = $1 AND destination_code = $2 AND search_date = $3`,
    [origin, destination, dateKey],
  );
  if (rows.length === 0) return false;
  return Date.now() - new Date(rows[0].fetched_at).getTime() < CACHE_TTL_HOURS * 60 * 60 * 1000;
}

async function hasAnyCache(origin: string, destination: string, dateKey: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM route_cache WHERE origin_code = $1 AND destination_code = $2 AND search_date = $3`,
    [origin, destination, dateKey],
  );
  return rows.length > 0;
}

async function markCached(origin: string, destination: string, dateKey: string): Promise<void> {
  await pool.query(
    `INSERT INTO route_cache (origin_code, destination_code, search_date, fetched_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (origin_code, destination_code, search_date) DO UPDATE SET fetched_at = now()`,
    [origin, destination, dateKey],
  );
}

async function upsertLiveFlight(leg: LiveFlightLeg, dateKey: string): Promise<void> {
  const id = `${leg.flightNumber}-${leg.originCode}${leg.destinationCode}-${dateKey}`;

  await withTransaction(async (client) => {
    const { rows: existing } = await client.query("SELECT id FROM flights WHERE id = $1", [id]);
    if (existing.length > 0) return;

    await client.query(
      `INSERT INTO airlines (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
      [leg.airlineCode, leg.airlineName],
    );

    const durationMinutes = durationMinutesBetween(leg.departureTimeUtc, leg.arrivalTimeUtc);

    await client.query(
      `INSERT INTO flights (id, flight_number, airline_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, stops, aircraft, source, departure_date_local)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, 'live', $10)`,
      [
        id,
        leg.flightNumber,
        leg.airlineCode,
        leg.originCode,
        leg.destinationCode,
        leg.departureTimeUtc,
        leg.arrivalTimeUtc,
        durationMinutes,
        leg.aircraft,
        leg.departureDateLocal,
      ],
    );

    await synthesizeFaresAndSeats(client, id, durationMinutes);
  });
}

// Called from the flights search route before its existing SQL query runs. Ensures the local
// `flights`/`flight_fares`/`flight_seats` tables have rows for this route+date — either freshly
// synced from the live schedule API, still-fresh from a recent sync, or (no API key configured)
// simulated for local dev — so the rest of the booking pipeline never has to know the difference.
export async function ensureFlightsForRoute(origin: string, destination: string, dateKey: string): Promise<void> {
  const routeLabel = `${origin}->${destination} on ${dateKey}`;

  if (await isCacheFresh(origin, destination, dateKey)) {
    console.log(`[flightSync] ${routeLabel}: cache hit, skipping sync`);
    return;
  }

  if (!AERODATABOX_RAPIDAPI_KEY) {
    console.log(`[flightSync] ${routeLabel}: no AERODATABOX_RAPIDAPI_KEY, generating simulated flights`);
    await withTransaction((client) => generateSimulatedFlights(client, origin, destination, dateKey));
    await markCached(origin, destination, dateKey);
    return;
  }

  try {
    const legs = await fetchLiveFlightsForRoute(AERODATABOX_RAPIDAPI_KEY, origin, destination, dateKey);
    for (const leg of legs) {
      await upsertLiveFlight(leg, dateKey);
    }
    console.log(`[flightSync] ${routeLabel}: synced ${legs.length} live flight(s)`);
    await markCached(origin, destination, dateKey);
  } catch (err) {
    if (await hasAnyCache(origin, destination, dateKey)) {
      console.warn(`[flightSync] ${routeLabel}: AeroDataBox fetch failed, serving stale cache:`, err);
      return;
    }
    console.error(`[flightSync] ${routeLabel}: AeroDataBox fetch failed, no cache to fall back on:`, err);
    throw new HttpError(502, "Live flight data is temporarily unavailable — please try again shortly");
  }
}
