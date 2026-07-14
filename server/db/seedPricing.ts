import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const countryCurrency: Record<string, string> = JSON.parse(
  readFileSync(path.join(__dirname, "data", "countryCurrency.json"), "utf-8"),
);
const exchangeRates: Record<string, number> = JSON.parse(
  readFileSync(path.join(__dirname, "data", "exchangeRates.json"), "utf-8"),
);

// GST-terminology countries and the US (sales tax, no federal VAT/GST) get their real regional
// label; everything else defaults to "VAT" (the terminology most of the world actually uses).
const GST_COUNTRIES = new Set(["India", "Australia", "Canada", "New Zealand", "Singapore", "Malaysia"]);
const SALES_TAX_COUNTRIES = new Set(["United States", "Puerto Rico", "Guam"]);

function taxLabelForCountry(country: string): string {
  if (GST_COUNTRIES.has(country)) return "GST";
  if (SALES_TAX_COUNTRIES.has(country)) return "Sales Tax";
  return "VAT";
}

// This script is deliberately separate from server/db/seed.ts: that script destructively
// truncates and regenerates airports/flights/bookings every run, but fare_rules/promotions/
// season_pricing_rules are meant to be admin-editable configuration — re-running the flight seed
// must never wipe pricing decisions someone made. Every statement here is an idempotent upsert.
async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log(`Upserting ${Object.keys(countryCurrency).length} countries...`);
    for (const [country, currencyCode] of Object.entries(countryCurrency)) {
      await client.query(
        `INSERT INTO countries (country, currency_code, tax_label)
         VALUES ($1, $2, $3)
         ON CONFLICT (country) DO UPDATE SET currency_code = EXCLUDED.currency_code, tax_label = EXCLUDED.tax_label`,
        [country, currencyCode, taxLabelForCountry(country)],
      );
    }

    console.log(`Upserting ${Object.keys(exchangeRates).length} exchange rates...`);
    for (const [currencyCode, rateToUsd] of Object.entries(exchangeRates)) {
      await client.query(
        `INSERT INTO exchange_rates (currency_code, rate_to_usd, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (currency_code) DO UPDATE SET rate_to_usd = EXCLUDED.rate_to_usd, updated_at = now()`,
        [currencyCode, rateToUsd],
      );
    }

    // Catch-all rules (wildcard country/airline/class) — these alone cover every route, since
    // calculateFare() resolves the *display* currency/tax label from `countries`, not from the
    // rule itself. Amounts here are denominated in USD and converted at calculation time.
    //
    // No airline-specific example rules are seeded here on purpose: fare_rules.airline_code has a
    // FK into `airlines`, which is only populated lazily as real/simulated flights get synced —
    // seeding a rule against an airline code that doesn't exist yet would fail. Once airlines
    // exist (after any search), an operator can add airline-specific overrides safely.
    console.log("Upserting catch-all fare rules...");
    const catchAllRules: Array<{
      rule_type: "domestic" | "international";
      origin_country: string | null;
      destination_country: string | null;
      base_fare_flat: number;
      base_fare_per_minute: number;
      airport_tax_flat: number;
      fuel_surcharge_percent: number;
      service_charge_flat: number;
      convenience_fee_flat: number;
      gst_percent: number;
      priority: number;
    }> = [
      {
        rule_type: "domestic",
        origin_country: null,
        destination_country: null,
        base_fare_flat: 20,
        base_fare_per_minute: 0.35,
        airport_tax_flat: 8,
        fuel_surcharge_percent: 0.08,
        service_charge_flat: 5,
        convenience_fee_flat: 3,
        gst_percent: 0.05,
        priority: 0,
      },
      {
        rule_type: "international",
        origin_country: null,
        destination_country: null,
        base_fare_flat: 60,
        base_fare_per_minute: 0.55,
        airport_tax_flat: 25,
        fuel_surcharge_percent: 0.12,
        service_charge_flat: 10,
        convenience_fee_flat: 8,
        gst_percent: 0.08,
        priority: 0,
      },
      // Illustrative country-specific domestic overrides (higher priority than the catch-all, no
      // airline dependency) — shows the rule engine actually varying by country, not just by
      // domestic/international.
      {
        rule_type: "domestic",
        origin_country: "India",
        destination_country: "India",
        base_fare_flat: 15,
        base_fare_per_minute: 0.28,
        airport_tax_flat: 6,
        fuel_surcharge_percent: 0.1,
        service_charge_flat: 4,
        convenience_fee_flat: 2.5,
        gst_percent: 0.05,
        priority: 10,
      },
      {
        rule_type: "domestic",
        origin_country: "United States",
        destination_country: "United States",
        base_fare_flat: 25,
        base_fare_per_minute: 0.4,
        airport_tax_flat: 9,
        fuel_surcharge_percent: 0.07,
        service_charge_flat: 6,
        convenience_fee_flat: 4,
        gst_percent: 0.075,
        priority: 10,
      },
      {
        rule_type: "domestic",
        origin_country: "United Kingdom",
        destination_country: "United Kingdom",
        base_fare_flat: 22,
        base_fare_per_minute: 0.45,
        airport_tax_flat: 10,
        fuel_surcharge_percent: 0.09,
        service_charge_flat: 6,
        convenience_fee_flat: 4,
        gst_percent: 0.2,
        priority: 10,
      },
    ];
    for (const r of catchAllRules) {
      const { rows: existing } = await client.query(
        `SELECT id FROM fare_rules
         WHERE rule_type = $1
           AND origin_country IS NOT DISTINCT FROM $2
           AND destination_country IS NOT DISTINCT FROM $3
           AND airline_code IS NULL AND travel_class IS NULL`,
        [r.rule_type, r.origin_country, r.destination_country],
      );
      if (existing.length > 0) continue; // already seeded — leave any admin edits alone
      await client.query(
        `INSERT INTO fare_rules
           (rule_type, origin_country, destination_country, currency_code, base_fare_flat, base_fare_per_minute,
            airport_tax_flat, fuel_surcharge_percent, service_charge_flat, convenience_fee_flat, gst_percent, priority)
         VALUES ($1,$2,$3,'USD',$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          r.rule_type,
          r.origin_country,
          r.destination_country,
          r.base_fare_flat,
          r.base_fare_per_minute,
          r.airport_tax_flat,
          r.fuel_surcharge_percent,
          r.service_charge_flat,
          r.convenience_fee_flat,
          r.gst_percent,
          r.priority,
        ],
      );
    }

    console.log("Upserting season pricing rules...");
    const seasonRules = [
      { name: "Winter Holiday Peak", start_month: 12, start_day: 20, end_month: 1, end_day: 5, multiplier: 1.25 },
      { name: "Summer Peak", start_month: 6, start_day: 1, end_month: 8, end_day: 15, multiplier: 1.15 },
      { name: "Spring Off-Peak", start_month: 2, start_day: 1, end_month: 3, end_day: 15, multiplier: 0.9 },
    ];
    for (const s of seasonRules) {
      const { rows: existing } = await client.query("SELECT id FROM season_pricing_rules WHERE name = $1", [s.name]);
      if (existing.length > 0) continue;
      await client.query(
        `INSERT INTO season_pricing_rules (name, start_month, start_day, end_month, end_day, multiplier)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [s.name, s.start_month, s.start_day, s.end_month, s.end_day, s.multiplier],
      );
    }

    console.log("Upserting automatic promotions...");
    const promotions = [
      { description: "Group booking discount (5+ passengers)", discount_type: "percent", discount_value: 8, min_passengers: 5 },
      { description: "Family discount (3+ passengers)", discount_type: "percent", discount_value: 4, min_passengers: 3 },
    ];
    for (const p of promotions) {
      const { rows: existing } = await client.query("SELECT id FROM promotions WHERE description = $1", [p.description]);
      if (existing.length > 0) continue;
      await client.query(
        `INSERT INTO promotions (description, discount_type, discount_value, min_passengers)
         VALUES ($1,$2,$3,$4)`,
        [p.description, p.discount_type, p.discount_value, p.min_passengers],
      );
    }

    await client.query("COMMIT");
    console.log("Pricing seed complete.");
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
