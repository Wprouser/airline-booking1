-- Reference data

CREATE TABLE IF NOT EXISTS airports (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS airlines (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Flight inventory

CREATE TABLE IF NOT EXISTS flights (
  id TEXT PRIMARY KEY,
  flight_number TEXT NOT NULL,
  airline_code TEXT NOT NULL REFERENCES airlines(code),
  origin_code TEXT NOT NULL REFERENCES airports(code),
  destination_code TEXT NOT NULL REFERENCES airports(code),
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  stops INTEGER NOT NULL DEFAULT 0,
  aircraft TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flights_route_date
  ON flights (origin_code, destination_code, departure_time);

-- Per-class fare + capacity. This is the "capacity-based slot" counter (Pattern B):
-- checked/decremented under SELECT ... FOR UPDATE so concurrent bookings can't oversell a class.
CREATE TABLE IF NOT EXISTS flight_fares (
  id SERIAL PRIMARY KEY,
  flight_id TEXT NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  travel_class TEXT NOT NULL CHECK (travel_class IN ('economy', 'premium_economy', 'business', 'first')),
  price NUMERIC(10, 2) NOT NULL,
  total_seats INTEGER NOT NULL,
  booked_seats INTEGER NOT NULL DEFAULT 0 CHECK (booked_seats <= total_seats),
  UNIQUE (flight_id, travel_class)
);

-- Individual seat map. UNIQUE(flight_id, seat_number) + a conditional UPDATE ... WHERE
-- is_booked = false is the exclusivity mechanism (Pattern A) for a specific seat, layered on
-- top of the class-level capacity counter above.
CREATE TABLE IF NOT EXISTS flight_seats (
  id SERIAL PRIMARY KEY,
  flight_id TEXT NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  travel_class TEXT NOT NULL CHECK (travel_class IN ('economy', 'premium_economy', 'business', 'first')),
  seat_number TEXT NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (flight_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_flight_seats_flight_class
  ON flight_seats (flight_id, travel_class);

-- Bookings (PNR = bookings.id). No FK to Better Auth's "user" table on purpose: this schema
-- script and Better Auth's own migration are independent and may run in either order.
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  trip_type TEXT NOT NULL CHECK (trip_type IN ('one_way', 'round_trip')),
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);

-- One row per flight leg in the itinerary (1 for one-way, 2 for round-trip). Snapshots the
-- route/schedule/price at booking time so a later change to `flights`/`flight_fares` never
-- retroactively alters a past booking's record.
CREATE TABLE IF NOT EXISTS booking_legs (
  id SERIAL PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  flight_id TEXT NOT NULL REFERENCES flights(id),
  leg_type TEXT NOT NULL CHECK (leg_type IN ('outbound', 'return')),
  travel_class TEXT NOT NULL CHECK (travel_class IN ('economy', 'premium_economy', 'business', 'first')),
  airline_name TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  origin_code TEXT NOT NULL,
  destination_code TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  fare_price NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_legs_booking ON booking_legs (booking_id);

CREATE TABLE IF NOT EXISTS passengers (
  id SERIAL PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  passport_number TEXT,
  nationality TEXT,
  special_meal TEXT,
  seat_preference TEXT
);

CREATE INDEX IF NOT EXISTS idx_passengers_booking ON passengers (booking_id);

-- Assigned seat per passenger per leg. UNIQUE(booking_leg_id, seat_number) prevents two
-- passengers on the same leg from ending up with the same seat number even under a race.
CREATE TABLE IF NOT EXISTS passenger_seats (
  id SERIAL PRIMARY KEY,
  passenger_id INTEGER NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  booking_leg_id INTEGER NOT NULL REFERENCES booking_legs(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  UNIQUE (booking_leg_id, seat_number)
);

CREATE TABLE IF NOT EXISTS booking_addons (
  id SERIAL PRIMARY KEY,
  passenger_id INTEGER NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL CHECK (addon_type IN ('meal', 'baggage')),
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  method TEXT NOT NULL,
  card_last4 TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  transaction_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
