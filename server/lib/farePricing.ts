import type { Pool, PoolClient } from "pg";
import { pool } from "../db/pool.js";
import type { TravelClass } from "./fareSynthesis.js";

// A flight's cached per-seat fare, plus a passenger-count discount applied live per search/
// booking (see applyGroupDiscount below — flight_fares is a shared cached row, so it can't hold
// a value that depends on how many passengers *this* search has).
export interface FareBreakdown {
  currency: string;
  taxLabel: string;
  baseFare: number;
  airportTax: number;
  fuelSurcharge: number;
  serviceCharge: number;
  convenienceFee: number;
  discount: number;
  /** Internal — the rate `gst` was computed from, so a live discount can recompute gst on the new subtotal. */
  gstPercent: number;
  gst: number;
  total: number;
  /** Secondary display conversion, e.g. "≈ $142.50 USD" alongside the primary local-currency total. */
  approxUsd: number;
}

type Db = Pool | PoolClient;

// A single ensureFlightsForRoute() call synthesizes fares for every flight on one route+date —
// same origin/destination/date across (often dozens of) flights and 4 classes each. Country
// resolution, the season multiplier, and exchange rates are identical for the whole batch, and
// even the fare-rule match only varies by (airline, class), not by flight — repeating those
// lookups per flight-class was the "search looks hung" problem all over again (same root cause
// fixed for seat/fare inserts earlier: an N+1 query pattern against a remote DB). Passing one
// FarePricingCache into every calculateFare() call in a batch turns O(flights x classes) queries
// into O(distinct airlines x classes) at worst, usually far fewer.
export class FarePricingCache {
  airportCountry = new Map<string, string | null>();
  countryDisplay = new Map<string, CountryDisplay>();
  seasonMultiplier = new Map<string, number>();
  fareRule = new Map<string, FareRuleRow | null>();
  exchangeRate = new Map<string, number | null>();
}

const FARE_MULTIPLIER: Record<TravelClass, number> = {
  economy: 1,
  premium_economy: 1.6,
  business: 3.2,
  first: 5.5,
};

// Safety net used only if fare_rules is empty/misconfigured — a broken rules table must never
// break search or booking. Mirrors the formula this feature replaces.
const FALLBACK_BASE_FARE_PER_MINUTE = 0.42;
const FALLBACK_BASE_FARE_FLAT = 35;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Resolved once per calculation from the `countries` table — this (not fare_rules.currency_code)
// is what makes every one of the 219 countries automatically get its correct real currency and
// regional tax label, without needing a bespoke fare_rules row per country.
interface CountryDisplay {
  currency: string;
  taxLabel: string;
}

async function resolveCountryDisplay(db: Db, country: string | undefined, cache?: FarePricingCache): Promise<CountryDisplay> {
  const cacheKey = country ?? "";
  const cached = cache?.countryDisplay.get(cacheKey);
  if (cached) return cached;

  let result: CountryDisplay = { currency: "USD", taxLabel: "Tax" };
  if (country) {
    const { rows } = await db.query<{ currency_code: string; tax_label: string }>(
      "SELECT currency_code, tax_label FROM countries WHERE country = $1",
      [country],
    );
    if (rows[0]) result = { currency: rows[0].currency_code, taxLabel: rows[0].tax_label };
  }
  cache?.countryDisplay.set(cacheKey, result);
  return result;
}

function fallbackBreakdown(travelClass: TravelClass, durationMinutes: number, display: CountryDisplay): FareBreakdown {
  const total = round2((durationMinutes * FALLBACK_BASE_FARE_PER_MINUTE + FALLBACK_BASE_FARE_FLAT) * FARE_MULTIPLIER[travelClass]);
  return {
    currency: display.currency,
    taxLabel: display.taxLabel,
    baseFare: total,
    airportTax: 0,
    fuelSurcharge: 0,
    serviceCharge: 0,
    convenienceFee: 0,
    discount: 0,
    gstPercent: 0,
    gst: 0,
    total,
    approxUsd: total,
  };
}

interface FareRuleRow {
  currency_code: string;
  base_fare_flat: number;
  base_fare_per_minute: number;
  airport_tax_flat: number;
  fuel_surcharge_percent: number;
  service_charge_flat: number;
  convenience_fee_flat: number;
  gst_percent: number;
  travel_class: TravelClass | null;
}

async function matchFareRule(
  db: Db,
  ruleType: "domestic" | "international",
  originCountry: string,
  destinationCountry: string,
  airlineCode: string,
  travelClass: TravelClass,
  cache?: FarePricingCache,
): Promise<FareRuleRow | null> {
  const cacheKey = `${ruleType}|${originCountry}|${destinationCountry}|${airlineCode}|${travelClass}`;
  if (cache?.fareRule.has(cacheKey)) return cache.fareRule.get(cacheKey)!;

  const { rows } = await db.query<FareRuleRow>(
    `SELECT currency_code, base_fare_flat, base_fare_per_minute, airport_tax_flat, fuel_surcharge_percent,
            service_charge_flat, convenience_fee_flat, gst_percent, travel_class,
            (CASE WHEN origin_country IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN destination_country IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN airline_code IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN travel_class IS NOT NULL THEN 1 ELSE 0 END) AS specificity
     FROM fare_rules
     WHERE active
       AND rule_type = $1
       AND (origin_country IS NULL OR origin_country = $2)
       AND (destination_country IS NULL OR destination_country = $3)
       AND (airline_code IS NULL OR airline_code = $4)
       AND (travel_class IS NULL OR travel_class = $5)
     ORDER BY specificity DESC, priority DESC
     LIMIT 1`,
    [ruleType, originCountry, destinationCountry, airlineCode, travelClass],
  );
  const result = rows[0] ?? null;
  cache?.fareRule.set(cacheKey, result);
  return result;
}

// Recurring yearly ranges (no year component), so a small table is fetched and matched in JS
// rather than fighting SQL date-range wraparound (e.g. a "Dec 15 - Jan 5" peak).
async function matchSeasonMultiplier(db: Db, month: number, day: number, cache?: FarePricingCache): Promise<number> {
  const cacheKey = `${month}-${day}`;
  const cached = cache?.seasonMultiplier.get(cacheKey);
  if (cached !== undefined) return cached;

  const { rows } = await db.query<{
    start_month: number;
    start_day: number;
    end_month: number;
    end_day: number;
    multiplier: number;
  }>("SELECT start_month, start_day, end_month, end_day, multiplier FROM season_pricing_rules WHERE active");

  const key = month * 100 + day;
  let best: number | null = null;
  for (const r of rows) {
    const startKey = r.start_month * 100 + r.start_day;
    const endKey = r.end_month * 100 + r.end_day;
    const inRange = startKey <= endKey ? key >= startKey && key <= endKey : key >= startKey || key <= endKey;
    if (inRange && (best === null || Math.abs(r.multiplier - 1) > Math.abs(best - 1))) {
      best = r.multiplier;
    }
  }
  const result = best ?? 1;
  cache?.seasonMultiplier.set(cacheKey, result);
  return result;
}

async function getRate(db: Db, currencyCode: string, cache?: FarePricingCache): Promise<number | null> {
  if (currencyCode === "USD") return 1;
  if (cache?.exchangeRate.has(currencyCode)) return cache.exchangeRate.get(currencyCode)!;

  const { rows } = await db.query<{ rate_to_usd: number }>(
    "SELECT rate_to_usd FROM exchange_rates WHERE currency_code = $1",
    [currencyCode],
  );
  const rate = rows[0]?.rate_to_usd ?? null;
  cache?.exchangeRate.set(currencyCode, rate);
  return rate;
}

// Converts every monetary field in a breakdown from its current currency into `toCurrency`, via
// USD as the common base (exchange_rates stores "units of X per 1 USD"). Missing rates leave the
// breakdown in its original currency rather than guessing.
async function convertBreakdownCurrency(
  db: Db,
  breakdown: FareBreakdown,
  toCurrency: string,
  cache?: FarePricingCache,
): Promise<FareBreakdown> {
  if (breakdown.currency === toCurrency) return breakdown;

  const fromRate = await getRate(db, breakdown.currency, cache);
  const toRate = await getRate(db, toCurrency, cache);
  if (!fromRate || !toRate) return breakdown;

  const factor = toRate / fromRate;
  const c = (n: number) => round2(n * factor);
  return {
    ...breakdown,
    currency: toCurrency,
    baseFare: c(breakdown.baseFare),
    airportTax: c(breakdown.airportTax),
    fuelSurcharge: c(breakdown.fuelSurcharge),
    serviceCharge: c(breakdown.serviceCharge),
    convenienceFee: c(breakdown.convenienceFee),
    discount: c(breakdown.discount),
    gst: c(breakdown.gst),
    total: c(breakdown.total),
  };
}

async function toUsd(db: Db, amount: number, currencyCode: string, cache?: FarePricingCache): Promise<number> {
  const rate = await getRate(db, currencyCode, cache);
  return rate ? round2(amount / rate) : round2(amount);
}

async function resolveAirportCountry(db: Db, code: string, cache?: FarePricingCache): Promise<string | null> {
  if (cache?.airportCountry.has(code)) return cache.airportCountry.get(code)!;
  const { rows } = await db.query<{ country: string }>("SELECT country FROM airports WHERE code = $1", [code]);
  const country = rows[0]?.country ?? null;
  cache?.airportCountry.set(code, country);
  return country;
}

export async function calculateFare(params: {
  db?: Db;
  originCode: string;
  destinationCode: string;
  airlineCode: string;
  travelClass: TravelClass;
  durationMinutes: number;
  /** Origin airport's local departure date, "YYYY-MM-DD" — drives seasonal pricing. */
  departureDateLocal: string;
  /** Reuse across every flight/class on the same route+date — see FarePricingCache. */
  cache?: FarePricingCache;
}): Promise<FareBreakdown> {
  const db = params.db ?? pool;
  const { originCode, destinationCode, airlineCode, travelClass, durationMinutes, departureDateLocal, cache } = params;

  console.log(
    `[farePricing] request: ${originCode}->${destinationCode} airline=${airlineCode} class=${travelClass} ` +
      `duration=${durationMinutes}min date=${departureDateLocal}`,
  );

  const [originCountry, destinationCountry] = await Promise.all([
    resolveAirportCountry(db, originCode, cache),
    resolveAirportCountry(db, destinationCode, cache),
  ]);

  // Fares are shown in the origin country's currency ("point of sale" convention) — this applies
  // uniformly to domestic (origin == destination) and international routes alike.
  const display = await resolveCountryDisplay(db, originCountry ?? undefined, cache);

  let breakdown: FareBreakdown;
  if (!originCountry || !destinationCountry) {
    console.warn(`[farePricing] no country data for ${originCode}/${destinationCode} — using fallback formula`);
    breakdown = fallbackBreakdown(travelClass, durationMinutes, display);
  } else {
    const ruleType: "domestic" | "international" = originCountry === destinationCountry ? "domestic" : "international";
    const rule = await matchFareRule(db, ruleType, originCountry, destinationCountry, airlineCode, travelClass, cache);

    if (!rule) {
      console.warn(`[farePricing] no fare_rules match for ${ruleType} ${originCountry}->${destinationCountry} — using fallback formula`);
      breakdown = fallbackBreakdown(travelClass, durationMinutes, display);
    } else {
      const classMultiplier = rule.travel_class ? 1 : FARE_MULTIPLIER[travelClass];
      const [, monthStr, dayStr] = departureDateLocal.match(/^\d{4}-(\d{2})-(\d{2})$/) ?? [];
      const seasonMultiplier = monthStr ? await matchSeasonMultiplier(db, Number(monthStr), Number(dayStr), cache) : 1;

      const baseFare = round2((rule.base_fare_flat + rule.base_fare_per_minute * durationMinutes) * classMultiplier * seasonMultiplier);
      const airportTax = round2(rule.airport_tax_flat);
      const fuelSurcharge = round2(baseFare * rule.fuel_surcharge_percent);
      const serviceCharge = round2(rule.service_charge_flat);
      const convenienceFee = round2(rule.convenience_fee_flat);
      const subtotal = baseFare + airportTax + fuelSurcharge + serviceCharge + convenienceFee;
      const gst = round2(subtotal * rule.gst_percent);
      const total = round2(subtotal + gst);

      const rawBreakdown: FareBreakdown = {
        currency: rule.currency_code,
        taxLabel: display.taxLabel,
        baseFare,
        airportTax,
        fuelSurcharge,
        serviceCharge,
        convenienceFee,
        discount: 0,
        gstPercent: rule.gst_percent,
        gst,
        total,
        approxUsd: 0, // filled in below, after currency conversion
      };
      breakdown = await convertBreakdownCurrency(db, rawBreakdown, display.currency, cache);
      breakdown.taxLabel = display.taxLabel;
    }
  }

  breakdown.approxUsd = await toUsd(db, breakdown.total, breakdown.currency, cache);

  console.log(`[farePricing] result: ${JSON.stringify(breakdown)}`);
  return breakdown;
}

export interface GroupPromotion {
  discount_type: "percent" | "flat";
  discount_value: number;
}

// One DB lookup per (passengerCount, travelClass) — callers with multiple flights to discount
// (e.g. a whole page of search results, which all share the same passenger count/class) should
// call this once and reuse the result via applyPromoToBreakdown, rather than re-querying per row.
export async function findGroupPromotion(
  db: Db,
  passengerCount: number,
  travelClass: TravelClass,
): Promise<GroupPromotion | null> {
  const { rows } = await db.query<GroupPromotion>(
    `SELECT discount_type, discount_value FROM promotions
     WHERE active
       AND min_passengers <= $1
       AND (travel_class IS NULL OR travel_class = $2)
       AND (starts_at IS NULL OR starts_at <= now())
       AND (ends_at IS NULL OR ends_at >= now())
     ORDER BY discount_value DESC
     LIMIT 1`,
    [passengerCount, travelClass],
  );
  return rows[0] ?? null;
}

// Pure/sync — no DB access, safe to call once per flight in a batch. approxUsd is left as-is
// (still roughly right; exact re-conversion happens only where it matters, e.g. a single booking).
export function applyPromoToBreakdown(breakdown: FareBreakdown, promo: GroupPromotion | null): FareBreakdown {
  if (!promo) return breakdown;

  const preDiscountSubtotal =
    breakdown.baseFare + breakdown.airportTax + breakdown.fuelSurcharge + breakdown.serviceCharge + breakdown.convenienceFee;
  const rawDiscount = promo.discount_type === "percent" ? preDiscountSubtotal * (promo.discount_value / 100) : promo.discount_value;
  const discount = round2(Math.min(rawDiscount, preDiscountSubtotal));
  const subtotal = preDiscountSubtotal - discount;
  const gst = round2(subtotal * breakdown.gstPercent);
  const total = round2(subtotal + gst);
  const approxUsd = breakdown.total > 0 ? round2((breakdown.approxUsd * total) / breakdown.total) : breakdown.approxUsd;

  return { ...breakdown, discount, gst, total, approxUsd };
}

// Layer 2: cheap, live, per-request. Applies an automatic (no promo-code entry in the UI)
// passenger-count discount on top of a cached breakdown from calculateFare — this is what makes
// "recalculate when passenger count changes" true without invalidating the per-flight fare cache.
// Convenience wrapper around findGroupPromotion + applyPromoToBreakdown for single-flight callers
// (e.g. booking creation, which prices exactly one leg at a time).
export async function applyGroupDiscount(
  db: Db,
  breakdown: FareBreakdown,
  passengerCount: number,
  travelClass: TravelClass,
): Promise<FareBreakdown> {
  const promo = await findGroupPromotion(db, passengerCount, travelClass);
  const result = applyPromoToBreakdown(breakdown, promo);
  if (promo) {
    console.log(`[farePricing] group discount applied: passengers=${passengerCount} discount=${result.discount} newTotal=${result.total}`);
  }
  return result;
}
