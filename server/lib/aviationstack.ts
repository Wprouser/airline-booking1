// Client for AviationStack (apilayer) — added alongside AeroDataBox, not in place of it. See
// config.ts for why: AviationStack has no way to answer "what flights fly route X→Y on date N"
// for dates within 7 days (the endpoint that does this, flightsFuture, requires a paid plan and
// only accepts dates more than 7 days out), so AeroDataBox keeps powering flight search.
//
// What AviationStack IS used for here: on-demand flight status, and on-demand airport/airline
// lookups — deliberately not called automatically anywhere, because the free plan is capped at
// 100 requests/month total (vs. AeroDataBox's 600/month). Calling this per search or per page
// load would exhaust the entire month's quota in hours.
//
// Auth is a query-string param (?access_key=...), not a header — different from AeroDataBox's
// RapidAPI header auth.

const API_BASE = "https://api.aviationstack.com/v1";

function redact(url: string): string {
  return url.replace(/access_key=[^&]+/, "access_key=***");
}

interface AviationStackErrorBody {
  error?: { code?: string; message?: string; type?: string };
}

async function request<T>(
  endpoint: string,
  params: Record<string, string>,
  apiKey: string,
  attempt = 0,
): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);
  url.searchParams.set("access_key", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  console.log(`[aviationstack] API request: GET ${redact(url.toString())}`);

  let res: Response;
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    if (attempt === 0) {
      console.warn(`[aviationstack] request to ${endpoint} failed, retrying once:`, err);
      return request<T>(endpoint, params, apiKey, attempt + 1);
    }
    console.error(`[aviationstack] request to ${endpoint} failed after retry:`, err);
    throw new Error("AviationStack request failed (network error)");
  }

  console.log(`[aviationstack] API response: HTTP ${res.status} for ${endpoint}`);

  if (!res.ok) {
    // Retry once on transient server errors; a 4xx (bad key, bad params, quota exceeded) won't
    // succeed on retry, so fail immediately for those.
    if (res.status >= 500 && attempt === 0) {
      console.warn(`[aviationstack] server error ${res.status} from ${endpoint}, retrying once`);
      return request<T>(endpoint, params, apiKey, attempt + 1);
    }
    const body = (await res.json().catch(() => ({}))) as AviationStackErrorBody;
    const message = body.error?.message ?? `HTTP ${res.status}`;
    console.error(`[aviationstack] API error from ${endpoint}: ${message}`);
    throw new Error(`AviationStack error: ${message}`);
  }

  return (await res.json()) as T;
}

// ---- Flight status (real-time — works on the free plan, but only for flights within the
// "real-time / last 3 months" window, not arbitrary future bookings) ------------------------

export interface FlightStatusResult {
  status: string;
  airlineName: string | null;
  flightIata: string | null;
  departureAirportName: string | null;
  departureScheduled: string | null;
  departureEstimated: string | null;
  departureDelayMinutes: number | null;
  departureTerminal: string | null;
  departureGate: string | null;
  arrivalAirportName: string | null;
  arrivalScheduled: string | null;
  arrivalEstimated: string | null;
  arrivalDelayMinutes: number | null;
}

interface AviationStackFlightEntry {
  flight_date?: string;
  flight_status?: string;
  airline?: { name?: string };
  flight?: { iata?: string };
  departure?: {
    airport?: string;
    scheduled?: string;
    estimated?: string;
    delay?: number;
    terminal?: string;
    gate?: string;
  };
  arrival?: { airport?: string; scheduled?: string; estimated?: string; delay?: number };
}

// Verified live against a real key: `flight_date` as a request filter returns
// 403 function_access_restricted on the free plan (only `flight_iata`/`dep_iata`/`arr_iata` etc.
// work unfiltered by date there) — `flight_iata` alone is accepted. So the requested date is
// applied client-side instead: if the entry AviationStack returns for this flight number is for a
// different date than the one asked about, we correctly report "not available" rather than
// showing another day's status under this one's name.
export async function getFlightStatus(
  apiKey: string,
  flightIata: string,
  flightDate: string,
): Promise<FlightStatusResult | null> {
  const body = await request<{ data?: AviationStackFlightEntry[] }>("/flights", { flight_iata: flightIata }, apiKey);
  const entry = body.data?.find((e) => e.flight_date === flightDate);
  if (!entry) return null;

  return {
    status: entry.flight_status ?? "unknown",
    airlineName: entry.airline?.name ?? null,
    flightIata: entry.flight?.iata ?? null,
    departureAirportName: entry.departure?.airport ?? null,
    departureScheduled: entry.departure?.scheduled ?? null,
    departureEstimated: entry.departure?.estimated ?? null,
    departureDelayMinutes: entry.departure?.delay ?? null,
    departureTerminal: entry.departure?.terminal ?? null,
    departureGate: entry.departure?.gate ?? null,
    arrivalAirportName: entry.arrival?.airport ?? null,
    arrivalScheduled: entry.arrival?.scheduled ?? null,
    arrivalEstimated: entry.arrival?.estimated ?? null,
    arrivalDelayMinutes: entry.arrival?.delay ?? null,
  };
}

// ---- Airport / airline reference lookups (on-demand only — see file header) -----------------

export interface AirportInfo {
  iata: string | null;
  name: string | null;
  countryName: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface AviationStackAirportEntry {
  iata_code?: string;
  airport_name?: string;
  country_name?: string;
  timezone?: string;
  latitude?: string | number;
  longitude?: string | number;
}

// Verified live: `search` as a request filter returns 403 function_access_restricted on the free
// plan; the exact-match `iata_code` filter is accepted and returns correctly-shaped, filtered data.
export async function getAirportInfo(apiKey: string, iataCode: string): Promise<AirportInfo | null> {
  const body = await request<{ data?: AviationStackAirportEntry[] }>("/airports", { iata_code: iataCode }, apiKey);
  const entry = body.data?.find((a) => a.iata_code === iataCode) ?? body.data?.[0];
  if (!entry) return null;

  return {
    iata: entry.iata_code ?? null,
    name: entry.airport_name ?? null,
    countryName: entry.country_name ?? null,
    timezone: entry.timezone ?? null,
    latitude: entry.latitude !== undefined ? Number(entry.latitude) : null,
    longitude: entry.longitude !== undefined ? Number(entry.longitude) : null,
  };
}

export interface AirlineInfo {
  iata: string | null;
  icao: string | null;
  name: string | null;
  countryName: string | null;
  fleetSize: string | null;
}

interface AviationStackAirlineEntry {
  iata_code?: string;
  icao_code?: string;
  airline_name?: string;
  country_name?: string;
  fleet_size?: string;
}

// Same `search` restriction as getAirportInfo above — use exact-match `iata_code` instead.
export async function getAirlineInfo(apiKey: string, iataCode: string): Promise<AirlineInfo | null> {
  const body = await request<{ data?: AviationStackAirlineEntry[] }>("/airlines", { iata_code: iataCode }, apiKey);
  const entry = body.data?.find((a) => a.iata_code === iataCode) ?? body.data?.[0];
  if (!entry) return null;

  return {
    iata: entry.iata_code ?? null,
    icao: entry.icao_code ?? null,
    name: entry.airline_name ?? null,
    countryName: entry.country_name ?? null,
    fleetSize: entry.fleet_size ?? null,
  };
}

// ---- Future schedules — implemented for completeness, intentionally unused ------------------

export interface FutureScheduleEntry {
  flightNumber: string | null;
  airlineName: string | null;
  scheduledTime: string | null;
  otherAirportIata: string | null;
}

interface AviationStackFutureEntry {
  flight?: { number?: string };
  airline?: { name?: string };
  departure?: { scheduledTime?: string };
  arrival?: { iataCode?: string };
}

// NOT called from any user-facing flow. flightsFuture requires a paid AviationStack plan and only
// accepts `date` values more than 7 days from today — incompatible with this app's search UI
// (departure date picker allows today onward). Kept implemented so the client fully covers the
// "Flight Schedules (where supported)" requirement, with the limitation documented here rather
// than silently omitted. See config.ts / README.md for the same note.
export async function getFutureSchedule(
  apiKey: string,
  iataCode: string,
  type: "departure" | "arrival",
  date: string,
): Promise<FutureScheduleEntry[]> {
  const body = await request<{ data?: AviationStackFutureEntry[] }>(
    "/flightsFuture",
    { iataCode, type, date },
    apiKey,
  );
  return (body.data ?? []).map((entry) => ({
    flightNumber: entry.flight?.number ?? null,
    airlineName: entry.airline?.name ?? null,
    scheduledTime: entry.departure?.scheduledTime ?? null,
    otherAirportIata: entry.arrival?.iataCode ?? null,
  }));
}
