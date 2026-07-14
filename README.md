# SkyBook — airline booking demo

## Setup

```
npm install
cp .env.example .env   # fill in DATABASE_URL, BETTER_AUTH_SECRET
npm run db:migrate
npm run auth:migrate
npm run seed
npm run dev
```

## Real flight data (optional)

By default (no `AERODATABOX_RAPIDAPI_KEY` set), flight search generates simulated flights so the
app works out of the box with zero signup.

To get real airline/flight-number/schedule data for flight search:

1. Sign up free at [rapidapi.com](https://rapidapi.com).
2. Subscribe to the **AeroDataBox** API's free **Basic** plan (600 requests/month, no cost — you
   can cap spend at $0 in RapidAPI's billing settings so nothing is ever charged even if you
   subscribe with a card on file).
3. Copy your `X-RapidAPI-Key` and set it as `AERODATABOX_RAPIDAPI_KEY` in `.env` (local) and in
   the Render dashboard's environment variables (production).

Airport reference data (the origin/destination pickers) is always real — a static snapshot of
~1,200 real-world airports from [OurAirports](https://ourairports.com/data/)' public-domain
dataset, seeded via `npm run seed`.

Since the free API quota is small, results are cached per route+date for 12 hours
(`route_cache` table) so repeat searches don't burn through it. If the quota is exhausted and no
cached data exists yet for a route, search returns a "temporarily unavailable" error rather than
fabricating flights.
