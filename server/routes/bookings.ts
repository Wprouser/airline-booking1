import { randomBytes } from "node:crypto";
import { Router } from "express";
import { pool, withTransaction, HttpError } from "../db/pool.js";
import { requireAuth } from "../auth.js";
import { CANCELLATION_CUTOFF_HOURS } from "../config.js";
import { applyGroupDiscount, type FareBreakdown } from "../lib/farePricing.js";

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

const TRAVEL_CLASSES = ["economy", "premium_economy", "business", "first"] as const;
type TravelClass = (typeof TRAVEL_CLASSES)[number];
const PNR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids visual ambiguity

function generatePnr(): string {
  const bytes = randomBytes(6);
  let pnr = "";
  for (let i = 0; i < 6; i++) pnr += PNR_ALPHABET[bytes[i] % PNR_ALPHABET.length];
  return pnr;
}

function generateTransactionRef(): string {
  return `TXN-${randomBytes(8).toString("hex").toUpperCase()}`;
}

// ---- request body validation -------------------------------------------------------------

interface LegInput {
  flightId: string;
  travelClass: TravelClass;
  legType: "outbound" | "return";
}

interface AddonInput {
  addonType: "meal" | "baggage";
  description: string;
  price: number;
}

interface PassengerInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  passportNumber: string | null;
  nationality: string | null;
  specialMeal: string | null;
  seatPreference: string | null;
  seatsByLeg: string[]; // one seat number per leg, aligned with legs[]
  addons: AddonInput[];
}

interface PaymentInput {
  method: string;
  cardNumber: string;
  nameOnCard: string;
  expiry: string;
  cvv: string;
}

interface CreateBookingBody {
  tripType: "one_way" | "round_trip";
  contactEmail: string;
  contactPhone: string;
  legs: LegInput[];
  passengers: PassengerInput[];
  payment: PaymentInput;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isTravelClass(v: unknown): v is TravelClass {
  return typeof v === "string" && (TRAVEL_CLASSES as readonly string[]).includes(v);
}

function validateCreateBody(body: unknown): CreateBookingBody {
  if (typeof body !== "object" || body === null) throw new HttpError(400, "Invalid request body");
  const b = body as Record<string, unknown>;

  if (b.tripType !== "one_way" && b.tripType !== "round_trip") {
    throw new HttpError(400, "tripType must be 'one_way' or 'round_trip'");
  }
  if (!isNonEmptyString(b.contactEmail) || !b.contactEmail.includes("@")) {
    throw new HttpError(400, "A valid contactEmail is required");
  }
  if (!isNonEmptyString(b.contactPhone)) {
    throw new HttpError(400, "contactPhone is required");
  }
  if (!Array.isArray(b.legs) || b.legs.length === 0) {
    throw new HttpError(400, "At least one flight leg is required");
  }
  const expectedLegCount = b.tripType === "round_trip" ? 2 : 1;
  if (b.legs.length !== expectedLegCount) {
    throw new HttpError(400, `${b.tripType} requires exactly ${expectedLegCount} leg(s)`);
  }
  const legs: LegInput[] = b.legs.map((raw, i) => {
    const leg = raw as Record<string, unknown>;
    if (!isNonEmptyString(leg.flightId)) throw new HttpError(400, `legs[${i}].flightId is required`);
    if (!isTravelClass(leg.travelClass)) throw new HttpError(400, `legs[${i}].travelClass is invalid`);
    const expectedType = i === 0 ? "outbound" : "return";
    if (leg.legType !== expectedType) throw new HttpError(400, `legs[${i}].legType must be '${expectedType}'`);
    return { flightId: leg.flightId, travelClass: leg.travelClass, legType: expectedType };
  });

  if (!Array.isArray(b.passengers) || b.passengers.length === 0) {
    throw new HttpError(400, "At least one passenger is required");
  }
  if (b.passengers.length > 9) {
    throw new HttpError(400, "A maximum of 9 passengers is allowed per booking");
  }
  const passengers: PassengerInput[] = b.passengers.map((raw, i) => {
    const p = raw as Record<string, unknown>;
    if (!isNonEmptyString(p.firstName) || !isNonEmptyString(p.lastName)) {
      throw new HttpError(400, `passengers[${i}] requires firstName and lastName`);
    }
    if (!Array.isArray(p.seatsByLeg) || p.seatsByLeg.length !== legs.length || !p.seatsByLeg.every(isNonEmptyString)) {
      throw new HttpError(400, `passengers[${i}].seatsByLeg must have one seat number per leg`);
    }
    const addonsRaw = Array.isArray(p.addons) ? p.addons : [];
    const addons: AddonInput[] = addonsRaw.map((rawAddon, j) => {
      const a = rawAddon as Record<string, unknown>;
      if (a.addonType !== "meal" && a.addonType !== "baggage") {
        throw new HttpError(400, `passengers[${i}].addons[${j}].addonType is invalid`);
      }
      if (!isNonEmptyString(a.description)) {
        throw new HttpError(400, `passengers[${i}].addons[${j}].description is required`);
      }
      const price = Number(a.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new HttpError(400, `passengers[${i}].addons[${j}].price is invalid`);
      }
      return { addonType: a.addonType, description: a.description, price };
    });
    return {
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: isNonEmptyString(p.dateOfBirth) ? p.dateOfBirth : null,
      gender: isNonEmptyString(p.gender) ? p.gender : null,
      passportNumber: isNonEmptyString(p.passportNumber) ? p.passportNumber : null,
      nationality: isNonEmptyString(p.nationality) ? p.nationality : null,
      specialMeal: isNonEmptyString(p.specialMeal) ? p.specialMeal : null,
      seatPreference: isNonEmptyString(p.seatPreference) ? p.seatPreference : null,
      seatsByLeg: p.seatsByLeg as string[],
      addons,
    };
  });

  // Seats must be distinct within each leg (no two passengers assigned the same seat client-side).
  for (let legIdx = 0; legIdx < legs.length; legIdx++) {
    const seatsThisLeg = passengers.map((p) => p.seatsByLeg[legIdx]);
    if (new Set(seatsThisLeg).size !== seatsThisLeg.length) {
      throw new HttpError(400, `Duplicate seat assignment on leg ${legIdx}`);
    }
  }

  const payRaw = b.payment as Record<string, unknown> | undefined;
  if (!payRaw || !isNonEmptyString(payRaw.cardNumber) || !isNonEmptyString(payRaw.nameOnCard)) {
    throw new HttpError(400, "payment details are required");
  }
  const digitsOnly = payRaw.cardNumber.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(digitsOnly)) {
    throw new HttpError(400, "cardNumber must be 13-19 digits");
  }
  if (!isNonEmptyString(payRaw.expiry) || !isNonEmptyString(payRaw.cvv)) {
    throw new HttpError(400, "expiry and cvv are required");
  }
  const payment: PaymentInput = {
    method: isNonEmptyString(payRaw.method) ? (payRaw.method as string) : "card",
    cardNumber: digitsOnly,
    nameOnCard: payRaw.nameOnCard as string,
    expiry: payRaw.expiry as string,
    cvv: payRaw.cvv as string,
  };

  return { tripType: b.tripType, contactEmail: b.contactEmail, contactPhone: b.contactPhone, legs, passengers, payment };
}

// Dummy payment gateway: a fixed "always declines" test card number lets the failure path be
// exercised on demand; everything else that passes basic format validation succeeds.
const DECLINE_TEST_CARD = "4000000000000002";

function toBookingSummary(row: Record<string, unknown>) {
  return {
    id: row.id,
    status: row.status,
    tripType: row.trip_type,
    totalAmount: row.total_amount,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    firstLegOrigin: row.first_leg_origin,
    firstLegDestination: row.first_leg_destination,
    firstLegDeparture: row.first_leg_departure,
    lastLegDeparture: row.last_leg_departure,
    passengerCount: Number(row.passenger_count),
    currency: row.currency,
  };
}

bookingsRouter.get("/mine", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       b.*,
       (SELECT origin_code FROM booking_legs WHERE booking_id = b.id ORDER BY departure_time ASC LIMIT 1) AS first_leg_origin,
       (SELECT destination_code FROM booking_legs WHERE booking_id = b.id ORDER BY departure_time ASC LIMIT 1) AS first_leg_destination,
       (SELECT departure_time FROM booking_legs WHERE booking_id = b.id ORDER BY departure_time ASC LIMIT 1) AS first_leg_departure,
       (SELECT departure_time FROM booking_legs WHERE booking_id = b.id ORDER BY departure_time DESC LIMIT 1) AS last_leg_departure,
       (SELECT COUNT(*) FROM passengers WHERE booking_id = b.id) AS passenger_count,
       (SELECT currency_code FROM booking_legs WHERE booking_id = b.id ORDER BY departure_time ASC LIMIT 1) AS currency
     FROM bookings b
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [req.user!.id],
  );
  res.json(rows.map(toBookingSummary));
});

async function loadFullBooking(bookingId: string) {
  const { rows: bookingRows } = await pool.query("SELECT * FROM bookings WHERE id = $1", [bookingId]);
  const booking = bookingRows[0];
  if (!booking) return null;

  const { rows: legs } = await pool.query(
    "SELECT * FROM booking_legs WHERE booking_id = $1 ORDER BY departure_time ASC",
    [bookingId],
  );
  const { rows: passengers } = await pool.query(
    "SELECT * FROM passengers WHERE booking_id = $1 ORDER BY id ASC",
    [bookingId],
  );
  const passengerIds = passengers.map((p) => p.id);
  const { rows: seats } = passengerIds.length
    ? await pool.query("SELECT * FROM passenger_seats WHERE passenger_id = ANY($1::int[])", [passengerIds])
    : { rows: [] };
  const { rows: addons } = passengerIds.length
    ? await pool.query("SELECT * FROM booking_addons WHERE passenger_id = ANY($1::int[])", [passengerIds])
    : { rows: [] };
  const { rows: payments } = await pool.query(
    "SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1",
    [bookingId],
  );

  return {
    id: booking.id,
    status: booking.status,
    tripType: booking.trip_type,
    contactEmail: booking.contact_email,
    contactPhone: booking.contact_phone,
    totalAmount: booking.total_amount,
    createdAt: booking.created_at,
    cancelledAt: booking.cancelled_at,
    userId: booking.user_id,
    legs: legs.map((l) => ({
      id: l.id,
      legType: l.leg_type,
      flightId: l.flight_id,
      travelClass: l.travel_class,
      airlineName: l.airline_name,
      flightNumber: l.flight_number,
      originCode: l.origin_code,
      destinationCode: l.destination_code,
      departureTime: l.departure_time,
      arrivalTime: l.arrival_time,
      farePrice: l.fare_price,
      currency: l.currency_code,
      breakdown: l.breakdown,
    })),
    passengers: passengers.map((p) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      dateOfBirth: p.date_of_birth,
      gender: p.gender,
      passportNumber: p.passport_number,
      nationality: p.nationality,
      specialMeal: p.special_meal,
      seatPreference: p.seat_preference,
      seats: seats
        .filter((s) => s.passenger_id === p.id)
        .map((s) => ({ bookingLegId: s.booking_leg_id, seatNumber: s.seat_number })),
      addons: addons
        .filter((a) => a.passenger_id === p.id)
        .map((a) => ({ addonType: a.addon_type, description: a.description, price: a.price })),
    })),
    payment: payments[0]
      ? {
          method: payments[0].method,
          cardLast4: payments[0].card_last4,
          status: payments[0].status,
          transactionRef: payments[0].transaction_ref,
          amount: payments[0].amount,
        }
      : null,
  };
}

bookingsRouter.get("/:id", async (req, res) => {
  const booking = await loadFullBooking(req.params.id);
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.userId !== req.user!.id) throw new HttpError(403, "You do not have access to this booking");
  res.json(booking);
});

bookingsRouter.post("/", async (req, res) => {
  const body = validateCreateBody(req.body);

  // Dummy payment gateway check happens before any DB writes — a declined card must never
  // touch seat inventory.
  if (body.payment.cardNumber === DECLINE_TEST_CARD) {
    throw new HttpError(402, "Payment declined by card issuer. Please try a different card.");
  }

  const pnr = await withTransaction(async (client) => {
    const fareByLeg: { id: number; price: number; currencyCode: string; breakdown: FareBreakdown }[] = [];
    for (const leg of body.legs) {
      const { rows } = await client.query(
        "SELECT id, price, total_seats, booked_seats, currency_code, breakdown FROM flight_fares WHERE flight_id = $1 AND travel_class = $2 FOR UPDATE",
        [leg.flightId, leg.travelClass],
      );
      const fare = rows[0];
      if (!fare) throw new HttpError(404, `No ${leg.travelClass} fare found for flight ${leg.flightId}`);
      if (fare.booked_seats + body.passengers.length > fare.total_seats) {
        throw new HttpError(409, `Not enough ${leg.travelClass} seats remaining on flight ${leg.flightId}`);
      }
      // Same passenger-count discount logic used to price this leg in search results — keeps the
      // amount actually charged consistent with what was shown before payment.
      const breakdown = await applyGroupDiscount(client, fare.breakdown as FareBreakdown, body.passengers.length, leg.travelClass);
      if (breakdown.discount > 0) {
        console.log(`[bookings] leg ${leg.flightId} (${leg.travelClass}): group discount ${breakdown.discount} applied, total ${breakdown.total}`);
      }
      fareByLeg.push({ id: fare.id, price: breakdown.total, currencyCode: fare.currency_code, breakdown });
    }

    // Claim each requested seat with a conditional UPDATE — the WHERE is_booked = false clause
    // makes this atomic under concurrent requests even with the row lock above scoped to fares,
    // not individual seats.
    for (let legIdx = 0; legIdx < body.legs.length; legIdx++) {
      const leg = body.legs[legIdx];
      for (const passenger of body.passengers) {
        const seatNumber = passenger.seatsByLeg[legIdx];
        const { rows } = await client.query(
          `UPDATE flight_seats SET is_booked = true
           WHERE flight_id = $1 AND travel_class = $2 AND seat_number = $3 AND is_booked = false
           RETURNING id`,
          [leg.flightId, leg.travelClass, seatNumber],
        );
        if (rows.length === 0) {
          throw new HttpError(409, `Seat ${seatNumber} on flight ${leg.flightId} was just taken. Please pick another seat.`);
        }
      }
      await client.query("UPDATE flight_fares SET booked_seats = booked_seats + $1 WHERE flight_id = $2 AND travel_class = $3", [
        body.passengers.length,
        leg.flightId,
        leg.travelClass,
      ]);
    }

    const { rows: flightRows } = await client.query(
      `SELECT f.id, f.flight_number, f.origin_code, f.destination_code, f.departure_time, f.arrival_time, al.name AS airline_name
       FROM flights f JOIN airlines al ON al.code = f.airline_code
       WHERE f.id = ANY($1::text[])`,
      [body.legs.map((l) => l.flightId)],
    );
    const flightById = new Map(flightRows.map((f) => [f.id, f]));

    const addonsTotal = body.passengers.reduce(
      (sum, p) => sum + p.addons.reduce((s, a) => s + a.price, 0),
      0,
    );
    const legsTotal = fareByLeg.reduce((sum, f) => sum + f.price, 0) * body.passengers.length;
    const totalAmount = legsTotal + addonsTotal;

    let pnr = "";
    let bookingInserted = false;
    for (let attempt = 0; attempt < 5 && !bookingInserted; attempt++) {
      pnr = generatePnr();
      try {
        await client.query(
          `INSERT INTO bookings (id, user_id, status, trip_type, contact_email, contact_phone, total_amount)
           VALUES ($1, $2, 'confirmed', $3, $4, $5, $6)`,
          [pnr, req.user!.id, body.tripType, body.contactEmail, body.contactPhone, totalAmount],
        );
        bookingInserted = true;
      } catch (err) {
        if ((err as { code?: string }).code === "23505") continue; // PNR collision, retry
        throw err;
      }
    }
    if (!bookingInserted) throw new HttpError(500, "Could not generate a unique booking reference, please retry");

    const legIds: number[] = [];
    for (let legIdx = 0; legIdx < body.legs.length; legIdx++) {
      const leg = body.legs[legIdx];
      const flight = flightById.get(leg.flightId);
      if (!flight) throw new HttpError(404, `Flight ${leg.flightId} not found`);
      const { rows } = await client.query(
        `INSERT INTO booking_legs
           (booking_id, flight_id, leg_type, travel_class, airline_name, flight_number, origin_code, destination_code, departure_time, arrival_time, fare_price, currency_code, breakdown)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [
          pnr,
          leg.flightId,
          leg.legType,
          leg.travelClass,
          flight.airline_name,
          flight.flight_number,
          flight.origin_code,
          flight.destination_code,
          flight.departure_time,
          flight.arrival_time,
          fareByLeg[legIdx].price,
          fareByLeg[legIdx].currencyCode,
          JSON.stringify(fareByLeg[legIdx].breakdown),
        ],
      );
      legIds.push(rows[0].id);
    }

    for (const passenger of body.passengers) {
      const { rows } = await client.query(
        `INSERT INTO passengers
           (booking_id, first_name, last_name, date_of_birth, gender, passport_number, nationality, special_meal, seat_preference)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [
          pnr,
          passenger.firstName,
          passenger.lastName,
          passenger.dateOfBirth,
          passenger.gender,
          passenger.passportNumber,
          passenger.nationality,
          passenger.specialMeal,
          passenger.seatPreference,
        ],
      );
      const passengerId = rows[0].id;

      for (let legIdx = 0; legIdx < legIds.length; legIdx++) {
        await client.query(
          "INSERT INTO passenger_seats (passenger_id, booking_leg_id, seat_number) VALUES ($1,$2,$3)",
          [passengerId, legIds[legIdx], passenger.seatsByLeg[legIdx]],
        );
      }
      for (const addon of passenger.addons) {
        await client.query(
          "INSERT INTO booking_addons (passenger_id, addon_type, description, price) VALUES ($1,$2,$3,$4)",
          [passengerId, addon.addonType, addon.description, addon.price],
        );
      }
    }

    await client.query(
      `INSERT INTO payments (booking_id, amount, method, card_last4, status, transaction_ref)
       VALUES ($1,$2,$3,$4,'success',$5)`,
      [pnr, totalAmount, body.payment.method, body.payment.cardNumber.slice(-4), generateTransactionRef()],
    );

    return pnr;
  });

  const booking = await loadFullBooking(pnr);
  res.status(201).json(booking);
});

bookingsRouter.delete("/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
  const booking = rows[0];
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.user_id !== req.user!.id) throw new HttpError(403, "You do not have access to this booking");
  if (booking.status === "cancelled") throw new HttpError(400, "Booking is already cancelled");

  const { rows: legs } = await pool.query(
    "SELECT * FROM booking_legs WHERE booking_id = $1 ORDER BY departure_time ASC",
    [req.params.id],
  );
  const earliestDeparture = new Date(legs[0].departure_time);
  const hoursUntilDeparture = (earliestDeparture.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilDeparture < CANCELLATION_CUTOFF_HOURS) {
    throw new HttpError(
      400,
      `Bookings can only be cancelled at least ${CANCELLATION_CUTOFF_HOURS} hours before departure`,
    );
  }

  const { rows: passengers } = await pool.query("SELECT id FROM passengers WHERE booking_id = $1", [req.params.id]);
  const passengerIds = passengers.map((p) => p.id);
  const { rows: seats } = passengerIds.length
    ? await pool.query("SELECT * FROM passenger_seats WHERE passenger_id = ANY($1::int[])", [passengerIds])
    : { rows: [] };

  await withTransaction(async (client) => {
    await client.query("UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE id = $1", [
      req.params.id,
    ]);

    for (const leg of legs) {
      const seatsOnLeg = seats.filter((s) => s.booking_leg_id === leg.id);
      if (seatsOnLeg.length > 0) {
        await client.query(
          "UPDATE flight_seats SET is_booked = false WHERE flight_id = $1 AND seat_number = ANY($2::text[])",
          [leg.flight_id, seatsOnLeg.map((s) => s.seat_number)],
        );
      }
      await client.query(
        "UPDATE flight_fares SET booked_seats = booked_seats - $1 WHERE flight_id = $2 AND travel_class = $3",
        [passengerIds.length, leg.flight_id, leg.travel_class],
      );
    }
  });

  res.status(204).send();
});
