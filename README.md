# Sydney Opal Journey Tracker

A personal commute companion for Sydney that ingests your Opal activity statements, visualises spend/time trends, and overlays live departures and disruption alerts for the stops and lines you actually use.

> **Why this exists**
>
> I built this to understand and improve my own Sydney commute. Instead of being a generic transit app, this is opinionated around *my* routes, *my* routines, and *my* Opal data. The codebase demonstrates full‑stack ownership: data ingestion/parsing, secure storage, analytics, and real‑time integrations.

---

## Table of Contents

* [Features](#features)
* [Demo & Screenshots](#demo--screenshots)
* [Architecture](#architecture)
* [Tech Stack](#tech-stack)
* [Data Model](#data-model)
* [API](#api)

  * [Auth](#auth)
  * [Opal Upload & Parsing](#opal-upload--parsing)
  * [Trips & Stats](#trips--stats)
  * [Realtime & Alerts](#realtime--alerts)
* [Parsers: Opal Activity Statement](#parsers-opal-activity-statement)
* [Environment & Configuration](#environment--configuration)
* [Local Development](#local-development)
* [Background Jobs & Caching](#background-jobs--caching)
* [Security & Privacy](#security--privacy)
* [Accessibility & UX Notes](#accessibility--ux-notes)
* [Testing Strategy](#testing-strategy)
* [Performance Considerations](#performance-considerations)
* [Deployment](#deployment)
* [CI/CD](#cicd)
* [Roadmap](#roadmap)
* [Troubleshooting](#troubleshooting)
* [FAQs](#faqs)

---

## Features

* **Personal data ingestion**: Upload your Opal Activity Statement (CSV or HTML). The parser normalises trips and top-ups and flags default fares/missing taps.
* **Tagging & annotation**: Label journeys (e.g., `work`, `gym`, `social`, `late-ferry`) for personalised analytics.
* **Dashboards**: Weekly/monthly spend, average commute duration, penalty fare counts, time-of-day heatmaps, top routes.
* **Live departures**: Departure boards for your saved stops with real-time ETAs.
* **Service alerts**: Line‑level disruptions and advisories.
* **Favourites & presets**: Home/work stops, frequent lines (e.g., T1, T9, L1, Metro).
* **Privacy-first**: Your data stays in your database; enforced by Row Level Security.
* **Local colour**: Sydney‑specific language, badges ("Ferry Friday", "Tap‑off Hero"), and a weather ribbon for southerly busters.

---

## Demo & Screenshots

* **Live demo**: *optional; add link if hosted*
* **Screenshots**: Add `/docs/screenshots/*`

  * Onboarding (choose home/work stops)
  * Upload flow (CSV → parsed rows)
  * Dashboard (KPIs, charts)
  * Live departures & alerts
  * Trip table with inline tag editing

---

## Architecture

```mermaid
flowchart TD
  U[User] -->|HTTPS| FE[Next.js App Router]
  FE -->|NextAuth| AUTH[(Auth Providers)]
  FE -->|REST/JSON| API[API Routes]
  API --> DB[(PostgreSQL)]
  API --> STOR[(Object Storage)]
  API --> CACHE[(Realtime Cache)]
  API --> TFS[Transport NSW APIs]
  JOBS[Background Jobs/Cron] --> API
  JOBS --> DB
  JOBS --> CACHE
```

* **Frontend**: Next.js (TypeScript, Tailwind, TanStack Query)
* **API**: Next.js /api routes (or NestJS/FastAPI variant)
* **Database**: Postgres (Supabase/Neon)
* **Storage**: S3‑compatible (Supabase Storage)
* **Cache**: In‑memory (Edge/Server) + short‑lived DB snapshots
* **Background jobs**: Inngest/cron to refresh GTFS static bundles, tidy caches, and process uploads

### High‑level concerns

* **Isolation**: All queries are scoped by `user_id` with Postgres RLS.
* **Observability**: Structured logs (`pino`), request IDs, minimal metrics.
* **Resilience**: Circuit breaker & exponential backoff around Transport NSW calls.

---

## Tech Stack

* **Frontend**: Next.js 14+, React 18+, Tailwind CSS, TanStack Query, Zod
* **Backend**: Next.js API routes (Node 20+). Optional alternative: NestJS.
* **Database**: PostgreSQL 14+, Prisma ORM
* **Auth**: NextAuth (Email, Google OAuth)
* **Storage**: Supabase Storage/S3 for uploaded statements
* **Maps**: MapLibre/Leaflet + OpenStreetMap tiles
* **Charts**: Recharts
* **Background Jobs**: Inngest or node‑cron
* **Testing**: Vitest/Jest, Playwright, Supertest
* **CI/CD**: GitHub Actions, Vercel, Supabase

---

## Data Model

### Tables

* `users(id, email, created_at, tz)`
* `profiles(user_id FK, home_stop_id, work_stop_id, default_lines text[])`
* `opal_uploads(id, user_id FK, filename, mime, status, rows_parsed, uploaded_at)`
* `trips(id, user_id FK, tap_on_time timestamptz, tap_off_time timestamptz, mode text, line text, origin_name text, origin_stop_id text, dest_name text, dest_stop_id text, fare_cents int, default_fare bool, distance_km numeric, notes text, tags text[], source text)`
* `commute_windows(user_id FK, weekday int, start_time time, end_time time)`
* `favourites(user_id FK, stop_id text, route_id text)`
* `realtime_snapshots(id, stop_id text, captured_at timestamptz, payload jsonb)`
* `settings(user_id FK, privacy_opt_out bool default false, metrics_opt_in bool default false)`

### Entity Relationship Diagram

```mermaid
erDiagram
  users ||--|| profiles : has
  users ||--o{ opal_uploads : owns
  users ||--o{ trips : owns
  users ||--o{ commute_windows : configures
  users ||--o{ favourites : sets
  trips }o--o{ favourites : relates
```

### Indexing

* `trips(user_id, tap_on_time)` for range queries
* `trips(user_id, line)` for line filters
* `trips USING GIN (tags)` for tag filtering
* `realtime_snapshots(stop_id, captured_at DESC)` for latest reads

### Row Level Security (RLS) examples

```sql
-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Policy: users can select only their rows
CREATE POLICY trips_select
  ON trips FOR SELECT
  USING (user_id = auth.uid());

-- Policy: users can insert their own rows
CREATE POLICY trips_insert
  ON trips FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

---

## API

Base URL depends on deployment, e.g. `https://yourapp.vercel.app/api`.

### Conventions

* JSON everywhere
* Auth via NextAuth session (HTTP‑only cookie). For programmatic access, a PAT/JWT variant is available for CLI utilities.
* Errors follow `{ error: { code, message, details? } }` with non‑200 status codes.

### Auth

| Method | Path            | Description                                      |
| ------ | --------------- | ------------------------------------------------ |
| `POST` | `/auth/signin`  | Email link or Google OAuth (handled by NextAuth) |
| `POST` | `/auth/signout` | End session                                      |
| `GET`  | `/auth/session` | Current session info                             |

> **Note**: In Next.js, most auth endpoints are auto‑generated; these routes document behaviour rather than custom handlers.

### Opal Upload & Parsing

| Method | Path                      | Body                 | Description                              |                                                                  |
| ------ | ------------------------- | -------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| `POST` | `/opal/upload`            | `{ filename, mime }` | Returns pre‑signed URL (S3) + `uploadId` |                                                                  |
| `PUT`  | `(pre‑signed URL)`        | binary               | Uploads the file directly to storage     |                                                                  |
| `POST` | `/opal/parse/:uploadId`   | \`{ type: "csv"      | "html" }\`                               | Parses the stored file into `trips`; returns counts and warnings |
| `GET`  | `/opal/uploads/:uploadId` | –                    | Status of a single upload/parse job      |                                                                  |

**Response: `/opal/parse/:uploadId`**

```json
{
  "uploadId": "upl_01H...","+
"  "rowsParsed": 132,
  "warnings": [
    { "row": 42, "type": "DEFAULT_FARE", "message": "Unknown destination; set default_fare=true" },
    { "row": 97, "type": "TIMEZONE", "message": "Tap-off time before tap-on; check DST" }
  ],
  "summary": {
    "trips": 120,
    "topups": 12
  }
}
```

### Trips & Stats

| Method  | Path             | Query                               | Description                          |
| ------- | ---------------- | ----------------------------------- | ------------------------------------ |
| `GET`   | `/trips`         | `from,to,tags,line,page,pageSize`   | Paginated trip list with filters     |
| `PATCH` | `/trips/:id`     | `{ tags?, notes?, origin?, dest? }` | Update tags/notes/fixes              |
| `GET`   | `/stats/summary` | `from,to`                           | KPIs: spend, avg duration, penalties |
| `GET`   | `/stats/heatmap` | `from,to,granularity`               | Time‑of‑day/day‑of‑week heatmap data |

**Response: `/stats/summary`**

```json
{
  "period": { "from": "2025-07-01", "to": "2025-07-31" },
  "spendCents": 14350,
  "avgCommuteMinutes": 48,
  "penaltyFares": 1,
  "modeBreakdown": [
    { "mode": "Train", "trips": 36 },
    { "mode": "Metro", "trips": 8 },
    { "mode": "Ferry", "trips": 2 },
    { "mode": "Bus", "trips": 10 }
  ]
}
```

### Realtime & Alerts

| Method | Path               | Query           | Description                         |
| ------ | ------------------ | --------------- | ----------------------------------- |
| `GET`  | `/live/departures` | `stopId,limit`  | Next departures for a stop (cached) |
| `GET`  | `/live/alerts`     | `routeId?line?` | Service alerts for a route/line     |

**Response: `/live/departures`**

```json
{
  "stopId": "214748-NSW-2145",
  "generatedAt": "2025-08-27T08:05:12+10:00",
  "departures": [
    {
      "route": "T1",
      "destination": "Central",
      "scheduled": "2025-08-27T08:07:00+10:00",
      "estimated": "2025-08-27T08:09:00+10:00",
      "platform": "3",
      "status": "delayed"
    }
  ]
}
```

---

## Parsers: Opal Activity Statement

### Supported inputs

* **CSV** exported from your Opal account.
* **HTML** (printer‑friendly page) for users who can’t export CSV.

### CSV mapping

| CSV Column (example)        | Mapped Field  | Notes                                   |
| --------------------------- | ------------- | --------------------------------------- |
| `Date` (e.g., `2025-08-15`) | `tap_on_time` | Combined with `Time` and Sydney TZ      |
| `Time` (`07:42`)            | `tap_on_time` | 24‑hour local time                      |
| `From` (`Redfern Station`)  | `origin_name` | Stop inference normalises naming        |
| `To` (`Wynyard Station`)    | `dest_name`   | May be `Unknown` for default fares      |
| `Transport Mode` (`Train`)  | `mode`        | One of Train/Bus/Ferry/Light Rail/Metro |
| `Opal Card`                 | –             | Not stored; for privacy                 |
| `Fare` (`$4.92`)            | `fare_cents`  | Parsed to cents                         |
| `Discount/Adjustment`       | `fare_cents`  | Applied to net fare                     |
| `Distance` (`6.3 km`)       | `distance_km` | Parsed when available                   |
| `Notes`                     | `notes`       | Free‑text from user after import        |

### HTML parsing

* Use a tolerant DOM parser; target stable table headers.
* Fallback to text heuristics if header variations are detected.

### Normalisation & heuristics

* **Timezone**: Assume `Australia/Sydney`; convert to UTC in storage.
* **Missing tap‑off**: Mark `default_fare=true` if destination is unknown.
* **Stop/line inference**: Cross‑reference `tap_on_time ± 5 min` with scheduled GTFS for likely service/line.
* **Deduplication**: `(tap_on_time, origin_name, dest_name, fare_cents)` within a short window.
* **Validation**: Flag negative durations, unreasonable distances, or impossible sequences.

### Warnings & remediation

* Present a “Fix me” queue for rows with: default fares, time anomalies, unknown modes, or missing fields.

---

## Environment & Configuration

Create `.env.local` (Next.js) and server secrets (Vercel) using the keys below.

```env
# General
NEXT_PUBLIC_APP_NAME=Opal Journey Tracker
NEXT_PUBLIC_DEFAULT_CITY=Sydney
NODE_ENV=development

# Auth (NextAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_strong_secret
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database (Prisma -> Postgres)
DATABASE_URL=postgresql://user:password@localhost:5432/opal
SHADOW_DATABASE_URL=postgresql://user:password@localhost:5432/opal_shadow

# Object Storage (Supabase/S3)
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_BUCKET=opal-uploads

# Transport NSW API
TFNSW_API_KEY=your_api_key
TFNSW_TRIP_PLANNER_BASE=https://api.transport.nsw.gov.au

# Observability
LOG_LEVEL=info
ENABLE_METRICS=false

# Jobs
CRON_ENABLE=true
GTFS_REFRESH_CRON=0 3 * * *
```

---

## Local Development

### Prerequisites

* Node.js 20+
* pnpm or npm
* Docker (for Postgres + storage emulator) — optional but recommended

### Quick start

```bash
# 1) Install deps
pnpm install

# 2) Start services (Postgres)
docker compose up -d

# 3) Generate Prisma client & migrate
pnpm prisma migrate dev --name init

# 4) Seed with sample data (optional)
pnpm tsx scripts/seed.ts

# 5) Run the app
pnpm dev
```

### Docker Compose (example)

```yaml
version: '3.9'
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: opal
    ports: ["5432:5432"]
    volumes:
      - db_data:/var/lib/postgresql/data
volumes:
  db_data:
```

### Seeding

* Creates one demo user, a couple of trips, and saved stops.
* Use environment variable `SEED_WITH_FAKE_TRIPS=true` to include synthetic rows.

---

## Background Jobs & Caching

* **Job runner**: [Inngest](https://www.inngest.com/) functions live in `apps/web/src/jobs` and orchestrate async work.
* **Upload parsing**: `parseStatements` consumes `statements/uploaded` events and writes transactions without blocking uploads.
* **GTFS static refresh**: `refreshGtfs` runs nightly to pull new bundles and clear transit caches.
* **Realtime cache**: `apps/web/src/utils/cache` exposes Redis or in‑memory caches with 10–30s TTLs per stop.
* **Circuit breaker**: If Transport NSW is erroring, serve last good snapshot and display a banner.

---

## Security & Privacy

* **Data ownership**: Your Opal data stays in your DB. No third‑party analytics by default.
* **RLS**: Enforced on all user‑owned tables (`trips`, `opal_uploads`, etc.).
* **Secrets**: Managed via environment variables; never committed.
* **Uploads**: Pre‑signed URLs; virus scan hook optional.
* **PII minimisation**: Do not store card numbers; stations are OK.
* **Backups**: Enable automated Postgres backups; document restore steps.

### Threat model (summary)

* Session fixation → HTTP‑only cookies + SameSite=Lax.
* CSRF on mutating routes → CSRF token/Origin checks.
* SSRF via pre‑signed uploads → restrict bucket policies.
* API abuse → rate limit by IP + user ID.

---

## Accessibility & UX Notes

* Keyboard‑first navigation for upload and trip table.
* Charts: provide data tables and aria‑labels; never rely on colour alone.
* High‑contrast mode and reduced‑motion preference supported.

---

## Testing Strategy

* **Unit**: CSV/HTML parsers; date/time utilities; tag filters.
* **Integration**: API routes with Supertest and an ephemeral Postgres.
* **E2E**: Playwright flows — sign‑in, upload, parse, dashboard, edit trip.
* **Contract**: Mock Transport NSW endpoints; validate response shapes with Zod.
* **Fixtures**: Anonymised sample CSV/HTML in `fixtures/` with edge cases (DST, default fares, ferries).

### Example test commands

```bash
pnpm test                 # unit + integration
pnpm test:e2e            # Playwright
pnpm test:coverage       # coverage report
```

---

## Performance Considerations

* Paginate trip tables; virtualise long lists.
* Pre‑aggregate monthly stats (materialized views) for fast dashboards.
* Cache realtime results; debounce UI polling.
* Avoid N+1 queries with Prisma `include`/`select` patterns.

---

## Deployment

### Vercel + Supabase (reference)

1. Create Supabase project; apply schema via Prisma migrations.
2. Configure RLS policies.
3. Set Vercel environment variables (NextAuth, DB, TFNSW keys).
4. Link GitHub repo to Vercel; enable preview deployments.
5. Add cron job for GTFS refresh via Vercel cron or Inngest.

### Alternatives

* Render + NeonDB
* Fly.io + Postgres app

---

## CI/CD

* **GitHub Actions** workflow:

  * Install, type‑check, lint, test.
  * Build Next.js.
  * On `main` merge: deploy to Vercel; run DB migrations.

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck && pnpm lint && pnpm test
      - run: pnpm build
```

---

## Roadmap

* **Reliability scorecards**: Punctuality by line (merge GTFS static + realtime)
* **Park & Ride**: Occupancy widget for selected car parks
* **CLI**: `opal import` to parse local files headlessly
* **Notifications**: “Leave by” reminders based on your commute window
* **ML heuristics**: Better inference for unknown destinations
* **Offline mode**: Cache last dashboard snapshot

---

## Troubleshooting

* **Uploads stuck parsing**: Check job worker logs; ensure storage endpoint and credentials are valid.
* **No departures showing**: Verify TFNSW API key and base URL; inspect `/api/live/departures?stopId=...` in the browser.
* **Wrong times**: Confirm `Australia/Sydney` is used during parsing; re‑parse with correct TZ.
* **Default fares everywhere**: You may be missing tap‑offs; use the Fix queue to set destinations.

---

## FAQs

**Does this connect directly to my Opal account?**

> No. You export a statement (CSV/HTML) and upload it. Your data stays private.

**Can I use this outside Sydney?**

> It’s designed for Sydney (naming, lines, API integrations). Porting is possible but out of scope.

**What about buses without precise stop IDs?**

> The app stores the stop name as provided and attempts line inference when feasible.

**Can employers run this locally to test?**

> Yes. Use Docker Compose, run migrations, and seed data to explore without real credentials.

