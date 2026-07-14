// How many hours before scheduled departure a booking can still be cancelled. Configurable via
// env var so the rule can be tuned without a code change.
export const CANCELLATION_CUTOFF_HOURS = Number(process.env.CANCELLATION_CUTOFF_HOURS ?? 24);

// RapidAPI key for AeroDataBox (real flight schedule data). Unset means no live data source is
// configured, so flight search falls back to local simulated flights (see simulatedFlights.ts) —
// this keeps `npm run dev` working with zero setup.
export const AERODATABOX_RAPIDAPI_KEY = process.env.AERODATABOX_RAPIDAPI_KEY;
