import { Router } from "express";
import { pool } from "../db/pool.js";
import { getAirportInfo, getAirlineInfo } from "../lib/aviationstack.js";
import { AVIATIONSTACK_API_KEY } from "../config.js";

export const airportsRouter = Router();

airportsRouter.get("/", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT code, name, city, country FROM airports ORDER BY city",
  );
  res.json(rows);
});

// On-demand only — not called anywhere in the frontend. AviationStack's free plan is capped at
// 100 requests/month total, and this app already seeds ~1,200 real airports from a static dataset
// (see server/db/data/airports.json); calling this for every airport would burn 11x the entire
// month's quota in one pass. This exists so the AviationStack airport-lookup capability is
// implemented and reachable (e.g. for manual/developer use), without being wired into the
// automatic page-load path that would exhaust the quota.
airportsRouter.get("/:code/enrich", async (req, res) => {
  if (!AVIATIONSTACK_API_KEY) {
    res.json({ available: false, reason: "AviationStack is not configured on this server." });
    return;
  }
  try {
    const info = await getAirportInfo(AVIATIONSTACK_API_KEY, req.params.code.toUpperCase());
    res.json(info ? { available: true, airport: info } : { available: false, reason: "No AviationStack data for this airport code." });
  } catch (err) {
    console.error(`[airports/enrich] AviationStack lookup failed for ${req.params.code}:`, err);
    res.json({ available: false, reason: "AviationStack lookup temporarily unavailable." });
  }
});

// Same on-demand-only rationale as above, for airline reference data.
airportsRouter.get("/airlines/:code/enrich", async (req, res) => {
  if (!AVIATIONSTACK_API_KEY) {
    res.json({ available: false, reason: "AviationStack is not configured on this server." });
    return;
  }
  try {
    const info = await getAirlineInfo(AVIATIONSTACK_API_KEY, req.params.code.toUpperCase());
    res.json(info ? { available: true, airline: info } : { available: false, reason: "No AviationStack data for this airline code." });
  } catch (err) {
    console.error(`[airports/enrich] AviationStack lookup failed for airline ${req.params.code}:`, err);
    res.json({ available: false, reason: "AviationStack lookup temporarily unavailable." });
  }
});
