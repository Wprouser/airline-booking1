// Client for AeroDataBox's real-world flight schedule data (via RapidAPI, free "Basic" plan —
// 600 units/month).
//
// Field mapping below is verified against a real response from the by-airport departures
// endpoint (direction=Departure): each entry has `departure` (no `airport` field — it's implicit,
// the queried airport) and `arrival.airport` (the destination), `number` (e.g. "SQ 2783", with a
// space), `airline: {name, iata, icao}`, and `aircraft.model`. `arrival.airport.iata` and
// `number` are always present; `airline.iata` and `arrival.scheduledTime.utc` are occasionally
// missing (~1-3% of entries) — those are skipped rather than guessed at.

const API_HOST = "aerodatabox.p.rapidapi.com";
const API_BASE = `https://${API_HOST}`;

export interface LiveFlightLeg {
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  originCode: string;
  destinationCode: string;
  departureTimeUtc: string;
  arrivalTimeUtc: string;
  // Origin airport's local calendar date (YYYY-MM-DD) — see schema.sql's departure_date_local
  // comment for why search must filter on this instead of departureTimeUtc's date.
  departureDateLocal: string;
  aircraft: string;
}

interface AeroDataBoxDeparture {
  departure?: { scheduledTime?: { utc?: string; local?: string } };
  arrival?: { airport?: { iata?: string }; scheduledTime?: { utc?: string } };
  number?: string;
  aircraft?: { model?: string };
  airline?: { name?: string; iata?: string };
}

// AeroDataBox's by-airport schedule endpoint caps each request to a 12-hour local window, so a
// full day requires two calls.
function dayWindows(dateKey: string): [string, string][] {
  return [
    [`${dateKey}T00:00`, `${dateKey}T11:59`],
    [`${dateKey}T12:00`, `${dateKey}T23:59`],
  ];
}

async function fetchDepartureWindow(
  apiKey: string,
  originCode: string,
  fromLocal: string,
  toLocal: string,
): Promise<AeroDataBoxDeparture[]> {
  const url =
    `${API_BASE}/flights/airports/iata/${originCode}/${fromLocal}/${toLocal}` +
    `?direction=Departure&withLeg=true&withCancelled=false&withCodeshared=false&withCargo=false&withPrivate=false&withLocation=false`;

  const res = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": API_HOST,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`AeroDataBox request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { departures?: AeroDataBoxDeparture[] };
  return body.departures ?? [];
}

// AeroDataBox's timestamps are "YYYY-MM-DD HH:mm Z" (space-separated, not full ISO 8601) — valid
// input to `Date`, but normalized to a proper ISO string before it's used elsewhere.
function toIso(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapEntry(entry: AeroDataBoxDeparture, originCode: string): LiveFlightLeg | null {
  const destinationCode = entry.arrival?.airport?.iata;
  const departureRaw = entry.departure?.scheduledTime?.utc;
  const departureLocalRaw = entry.departure?.scheduledTime?.local;
  const arrivalRaw = entry.arrival?.scheduledTime?.utc;
  const flightNumber = entry.number?.replace(/\s+/g, "");
  const airlineName = entry.airline?.name;
  const airlineCode = entry.airline?.iata;
  const aircraft = entry.aircraft?.model ?? "Unknown";

  if (
    !destinationCode ||
    !departureRaw ||
    !departureLocalRaw ||
    !arrivalRaw ||
    !flightNumber ||
    !airlineCode ||
    !airlineName
  ) {
    return null;
  }
  const departureTimeUtc = toIso(departureRaw);
  const arrivalTimeUtc = toIso(arrivalRaw);
  // "local" is e.g. "2026-07-15 05:20+05:30" — the date is always the first 10 characters.
  const departureDateLocal = departureLocalRaw.slice(0, 10);
  if (!departureTimeUtc || !arrivalTimeUtc || !/^\d{4}-\d{2}-\d{2}$/.test(departureDateLocal)) return null;

  return {
    flightNumber,
    airlineCode,
    airlineName,
    originCode,
    destinationCode,
    departureTimeUtc,
    arrivalTimeUtc,
    departureDateLocal,
    aircraft,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchLiveFlightsForRoute(
  apiKey: string,
  originCode: string,
  destinationCode: string,
  dateKey: string,
): Promise<LiveFlightLeg[]> {
  const results: LiveFlightLeg[] = [];
  const windows = dayWindows(dateKey);
  let totalEntries = 0;
  for (let i = 0; i < windows.length; i++) {
    // The free Basic plan is rate-limited to ~1 request/second; back-to-back calls 429.
    if (i > 0) await sleep(1100);
    const [fromLocal, toLocal] = windows[i];
    const entries = await fetchDepartureWindow(apiKey, originCode, fromLocal, toLocal);
    totalEntries += entries.length;
    for (const entry of entries) {
      const mapped = mapEntry(entry, originCode);
      if (mapped && mapped.destinationCode === destinationCode && mapped.departureDateLocal === dateKey) {
        results.push(mapped);
      }
    }
  }
  console.log(
    `[aerodatabox] ${originCode}->${destinationCode} on ${dateKey}: ${totalEntries} departures from ${originCode}, ${results.length} matched to ${destinationCode}`,
  );
  return results;
}
