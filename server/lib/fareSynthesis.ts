import type { PoolClient } from "pg";
import { calculateFare, type FarePricingCache } from "./farePricing.js";

export const TRAVEL_CLASSES = ["economy", "premium_economy", "business", "first"] as const;
export type TravelClass = (typeof TRAVEL_CLASSES)[number];

function seatLetters(count: number): string[] {
  return ["A", "B", "C", "D", "E", "F"].slice(0, count);
}

export function seatsForClass(travelClass: TravelClass): string[] {
  switch (travelClass) {
    case "first":
      return [1, 2].flatMap((row) => ["A", "C", "D", "F"].map((l) => `${row}${l}`));
    case "business":
      return [3, 4, 5].flatMap((row) => ["A", "C", "D", "F"].map((l) => `${row}${l}`));
    case "premium_economy":
      return [7, 8, 9].flatMap((row) => seatLetters(6).map((l) => `${row}${l}`));
    case "economy":
      return Array.from({ length: 10 }, (_, i) => i + 10).flatMap((row) =>
        seatLetters(6).map((l) => `${row}${l}`),
      );
  }
}

// Neither the live schedule API nor the local simulator has real fare/seat-inventory data, so
// every flight (live or simulated) gets a synthesized price + seat map per travel class, keyed
// off its route/airline/class/date via the dynamic pricing engine (farePricing.ts). This is what
// the existing booking/seat-selection/payment flow reads from — `price` keeps its original
// meaning (a NUMERIC per (flight_id, travel_class)), just computed by the rule engine now.
//
// A flight has ~98 seats across 4 classes; inserting one row per query (as opposed to one
// multi-row INSERT per table) turned into ~2,000+ sequential round-trips for a single busy real
// route (e.g. 21 live flights x ~98 seats), which is what made live search look "hung" against a
// remote DB. Two batched inserts per flight fixes that.
export async function synthesizeFaresAndSeats(
  client: PoolClient,
  flightId: string,
  durationMinutes: number,
  route: { originCode: string; destinationCode: string; airlineCode: string; departureDateLocal: string },
  pricingCache?: FarePricingCache,
): Promise<void> {
  const fareValues: unknown[] = [];
  const farePlaceholders: string[] = [];
  const seatValues: unknown[] = [];
  const seatPlaceholders: string[] = [];

  for (const travelClass of TRAVEL_CLASSES) {
    const seats = seatsForClass(travelClass);
    const breakdown = await calculateFare({
      db: client,
      originCode: route.originCode,
      destinationCode: route.destinationCode,
      airlineCode: route.airlineCode,
      travelClass,
      durationMinutes,
      departureDateLocal: route.departureDateLocal,
      cache: pricingCache,
    });

    const fareBase = fareValues.length;
    farePlaceholders.push(
      `($${fareBase + 1}, $${fareBase + 2}, $${fareBase + 3}, $${fareBase + 4}, 0, $${fareBase + 5}, $${fareBase + 6})`,
    );
    fareValues.push(flightId, travelClass, breakdown.total, seats.length, breakdown.currency, JSON.stringify(breakdown));

    for (const seatNumber of seats) {
      const seatBase = seatValues.length;
      seatPlaceholders.push(`($${seatBase + 1}, $${seatBase + 2}, $${seatBase + 3}, false)`);
      seatValues.push(flightId, travelClass, seatNumber);
    }
  }

  await client.query(
    `INSERT INTO flight_fares (flight_id, travel_class, price, total_seats, booked_seats, currency_code, breakdown)
     VALUES ${farePlaceholders.join(", ")}
     ON CONFLICT (flight_id, travel_class) DO NOTHING`,
    fareValues,
  );
  await client.query(
    `INSERT INTO flight_seats (flight_id, travel_class, seat_number, is_booked)
     VALUES ${seatPlaceholders.join(", ")}
     ON CONFLICT (flight_id, seat_number) DO NOTHING`,
    seatValues,
  );
}
