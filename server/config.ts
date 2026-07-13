// How many hours before scheduled departure a booking can still be cancelled. Configurable via
// env var so the rule can be tuned without a code change.
export const CANCELLATION_CUTOFF_HOURS = Number(process.env.CANCELLATION_CUTOFF_HOURS ?? 24);
