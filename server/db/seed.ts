import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AirportSeed {
  code: string;
  name: string;
  city: string;
  country: string;
}

// Real-world airports (large_airport class, with an IATA code) from OurAirports' public-domain
// dataset — see server/db/data/README-ish note in the plan doc for how this file was built.
// Reference data like this barely changes, so it's committed as a static snapshot rather than
// fetched at seed time.
const AIRPORTS: AirportSeed[] = JSON.parse(
  readFileSync(path.join(__dirname, "data", "airports.json"), "utf-8"),
);

async function main() {
  const client = await pool.connect();
  try {
    console.log(`Resetting flight inventory + reference data (bookings cascade too)...`);
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE bookings, flight_seats, flight_fares, flights, airlines, airports RESTART IDENTITY CASCADE",
    );

    console.log(`Inserting ${AIRPORTS.length} real-world airports...`);
    const batchSize = 800;
    for (let i = 0; i < AIRPORTS.length; i += batchSize) {
      const chunk = AIRPORTS.slice(i, i + batchSize);
      const values: unknown[] = [];
      const placeholders = chunk
        .map((a, idx) => {
          const base = idx * 4;
          values.push(a.code, a.name, a.city, a.country);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
        })
        .join(", ");
      await client.query(
        `INSERT INTO airports (code, name, city, country) VALUES ${placeholders}`,
        values,
      );
    }

    // Airlines and flights are no longer bulk-generated here — they're created on demand per
    // search (real flights via AeroDataBox, or simulated ones as a no-API-key dev fallback). See
    // server/lib/flightSync.ts.

    await client.query("COMMIT");
    console.log("Seed complete.");
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
