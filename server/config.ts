// How many hours before scheduled departure a booking can still be cancelled. Configurable via
// env var so the rule can be tuned without a code change.
export const CANCELLATION_CUTOFF_HOURS = Number(process.env.CANCELLATION_CUTOFF_HOURS ?? 24);

// RapidAPI key for AeroDataBox (real flight schedule data). Unset means no live data source is
// configured, so flight search falls back to local simulated flights (see simulatedFlights.ts) —
// this keeps `npm run dev` working with zero setup.
//
// AeroDataBox intentionally still powers flight search — AviationStack (below) cannot: its only
// endpoint for route+date schedule queries requires a paid plan and only works for dates more
// than 7 days out, which excludes same-day-through-7-day searches (the bulk of real usage, and
// what our date picker allows). See server/lib/aviationstack.ts for what AviationStack is used
// for instead (on-demand flight status, airport/airline lookups).
export const AERODATABOX_RAPIDAPI_KEY = process.env.AERODATABOX_RAPIDAPI_KEY;

// AviationStack API key (query-param auth, not a header). Unset means the features that use it
// (live flight status, on-demand airport/airline lookups) are unavailable — they degrade to a
// clear "not configured" response rather than erroring, the same fallback philosophy as above.
export const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY;
