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

## Live flight status + reference lookups (optional, AviationStack)

Flight *search* stays on AeroDataBox above — AviationStack was evaluated as a replacement and
can't do that job: its only endpoint for "what flights fly route X→Y on date N" (`flightsFuture`)
requires a paid plan ($49.99+/mo) **and only accepts dates more than 7 days out**, which excludes
same-day-through-7-day searches — most of what this app's date picker (min = today) actually
needs. AeroDataBox has no such restriction.

What AviationStack *is* wired up for, on its free plan (100 requests/month total — keep this in
mind, it's far smaller than AeroDataBox's 600/month):

- **Live flight status** — a manual "Check Live Status" button on a booking's detail page
  (`/bookings/:id`). Only returns data for flights within AviationStack's real-time/recent window,
  so a booking for a future date will correctly say "not available yet" rather than error.
- **On-demand airport/airline lookups** — `GET /api/airports/:code/enrich` and
  `GET /api/airports/airlines/:code/enrich`. Not called anywhere automatically (the app already
  has ~1,200 real airports seeded statically; calling this per-airport would burn 11x the entire
  monthly quota in one pass) — these exist for manual/developer use.

To enable: sign up free at [aviationstack.com](https://aviationstack.com), copy your API key, and
set `AVIATIONSTACK_API_KEY` in `.env` (local) and Render's environment variables (production).
Auth is a query parameter (`access_key=`), unlike AeroDataBox's RapidAPI header auth. Leave unset
and these features simply report "not configured" — nothing else in the app is affected.
