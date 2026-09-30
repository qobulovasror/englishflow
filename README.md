# EnglishFlow

A vocabulary-learning platform with spaced repetition (SM-2), quizzes, decks, and progress tracking. Coordinated clients share one API:

| Layer | Stack | Path |
|------|-------|------|
| **Backend** | NestJS 10 · Prisma 5 · PostgreSQL 16 · JWT · RBAC | `src/`, `prisma/` |
| **Web** | Vue 3 · Pinia · Vite · Tailwind | `frontend/` |
| **Mobile** | Flutter 3.2 · Riverpod · Dio · GoRouter | `mobile/` |
| **Extension** | WXT · Vue 3 (save words while browsing) | `extension/` |

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for request flow, response envelope, schema, and deployment notes.

---

## Quick start

### Prerequisites

- Node.js 20+
- Docker (for Postgres)
- Flutter 3.2+ (only if you'll work on mobile)

### 1. Backend

```bash
# 1. Env file
cp .env.example .env
# Edit JWT_SECRET to a strong random string (the script below generates one)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 2. Postgres
docker compose up -d postgres

# 3. Install + migrate + run
npm install
npx prisma migrate deploy
npm run start:dev
```

Backend is now on `http://localhost:3000`. Swagger UI: `http://localhost:3000/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies API calls to `http://localhost:3000`.

### 3. Mobile

```bash
cd mobile
flutter pub get
# Android emulator hits the host via 10.0.2.2; iOS simulator hits localhost.
# Override at run time if needed:
flutter run --dart-define=BASE_URL=http://10.0.2.2:3000
```

---

## Common commands

### Backend (root)

| Command | Purpose |
|---------|---------|
| `npm run start:dev` | Watch-mode server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run prisma:migrate:dev` | Create + apply a new migration |
| `npm run prisma:migrate` | Apply pending migrations (production-safe) |
| `npm run prisma:generate` | Regenerate Prisma client types |
| `npm run openapi` | Export Swagger to `openapi.json` |
| `psql "$DATABASE_URL" -v srs_cutover_at='YYYY-MM-DD HH:MM:SS+00' -f scripts/srs-baseline.sql` | Measure new SM-2 review outcomes after deploying the interval-metrics migration |

### Frontend (`frontend/`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run type-check` | `vue-tsc --noEmit` |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run test:stores` | Check theme persistence and in-memory auth-token storage |

### Mobile (`mobile/`)

| Command | Purpose |
|---------|---------|
| `flutter run` | Run on a connected device or emulator |
| `flutter analyze` | Static analysis |
| `flutter test` | Run unit tests |

---

## Keeping types in sync

The web client's API types are hand-maintained in a single file, `frontend/src/types/index.ts`. When backend DTOs change, update the matching interface there. (`npm run openapi` at the repo root still writes `openapi.json`, used for Swagger docs and as the contract reference.)

The Flutter app likewise mirrors the backend by convention (no codegen). Run `flutter test` / `npm run type-check` to catch shape drift early.

### Vocabulary transfer and discovery

On the web **My Words** page, CSV/TSV files can be previewed and imported (up to 500 rows and 2 MB); malformed and duplicate rows are identified before import. CSV and Anki-compatible UTF-8 text exports are available. Anki maps `Front`/`Back` (or `Word`/`Translation`) plus optional `Example` and `Pronunciation`. Media and `.apkg` files are outside the current import scope. The Library supports CEFR, topic, learning-goal, and quality/popularity filters; visible shared decks can be copied to a private deck.

### Operations and SM-2 measurement

API request logs include a request ID. Configure `SENTRY_DSN` to send server errors to Sentry, SMTP variables for transactional email, and monitor `/health/ready` for database readiness. Email errors are logged but are not stored in a retry queue. Mobile offline reviews stay in the device queue until accepted or explicitly rejected.

After deploying the `review_interval_metrics` migration and finishing the application rollout, note that time and run `scripts/srs-baseline.sql` with it as `srs_cutover_at`. The report groups recall ratings by scheduled interval. It excludes older and rollout-window rows whose interval is unknown; a genuine first review is recorded as interval 0. Keep SM-2 active until the report contains at least 10,000 known-interval reviews from 500 learners and each compared interval band has 200 or more observations; any later FSRS test should use a separate schedule and a reversible server-side cohort assignment.

---

## Project structure (top level)

```
englishflow/
├── src/                  NestJS backend
│   ├── common/           Filters, interceptors, decorators, guards, DTOs, swagger helpers
│   ├── config/           ConfigModule + Joi env validation
│   ├── modules/          Feature modules (auth, users, words, learning, tests,
│   │                     progress, decks, admin, health, maintenance)
│   └── prisma/           PrismaService + module
├── prisma/
│   ├── schema.prisma     Source of truth for the database
│   ├── migrations/       Versioned SQL migrations
│   └── seed.ts           Optional seed script
├── frontend/             Vue 3 web client
├── mobile/               Flutter mobile client
├── scripts/
│   └── export-openapi.ts Headless Swagger export (no DB needed)
├── extension/            WXT + Vue browser extension
├── docker-compose.yml    Postgres + backend + web (nginx)
├── Dockerfile            Multi-stage backend image
├── openapi.json          Generated — committed to keep clients in sync
└── docs/ARCHITECTURE.md  Deeper system docs
```

---

## Environment variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | no | `development` | One of `development`, `production`, `test` |
| `PORT` | no | `3000` | API listen port |
| `DATABASE_URL` | **yes** | `postgresql://user:pw@host:5432/db?schema=public` | Validated as `postgres(ql)://...` |
| `JWT_SECRET` | **yes** | (≥32 chars) | App refuses to boot below 32 chars |
| `JWT_EXPIRES_IN` | no | `15m` | Access-token TTL; keep short (clients rotate via `/auth/refresh`) |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | no | `30` | Refresh-token lifetime |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Comma-separated list of allowed origins |
| `TRUST_PROXY` | no | `0` | Trusted reverse-proxy hops for client-IP (rate limiting); `1` behind nginx/CDN |
| `FRONTEND_URL` | no | `http://localhost:5173` | Base URL for account-recovery email links (defaults to first `CORS_ORIGIN`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | no | (see `.env.example`) | Transactional email; unset in dev → mailer logs the message + link to the console |
| `SENTRY_DSN` | no | (project DSN) | Enables Sentry error tracking; unset = disabled (no-op) |
| `LOG_LEVEL` | no | `info` | pino level; `silent` under `NODE_ENV=test` |

The Joi schema in `src/config/env.validation.ts` is the single source of truth — adding a variable requires updating the schema and `src/config/configuration.ts`.

---

## API response shape

All endpoints return one of these two envelopes:

**Success**
```json
{ "success": true, "data": <T>, "timestamp": "2026-05-11T12:00:00Z" }
```

**Error**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "errors": ["email must be an email"],
  "path": "/auth/register",
  "timestamp": "2026-05-11T12:00:00Z"
}
```

`TransformInterceptor` wraps success bodies; `AllExceptionsFilter` normalizes errors (HttpException, Prisma errors, validation pipe output, unknown). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Testing

- **Backend**: `npm test` (Jest unit) + `npm run test:e2e` (e2e vs in-memory Prisma stub); `npm run lint` + `npm run format:check` (ESLint + Prettier). CI additionally applies every migration to a real Postgres 16 (`migrations` job).
- **Frontend**: `npm run type-check` (`vue-tsc`) + `npm run lint` + `npm run format:check` (ESLint `eslint-plugin-vue` + Prettier). No component test runner yet.
- **Mobile**: `flutter analyze` + `flutter test` (unit/provider/widget tests under `mobile/test/`).
- **Extension**: `npm run compile` (`vue-tsc --noEmit`) in `extension/`.

See `docs/AUDIT.md` for the current quality/security backlog.

---

## Contributing

1. Branch from `main`.
2. Run lint/build/test for the layer you changed (backend: `npm run lint && npm test && npm run test:e2e`; web: `npm run lint && npm run type-check`; mobile: `flutter analyze && flutter test`). Backend + web are ESLint + Prettier gated in CI.
3. If you change the backend API: run `npm run openapi` and commit the regenerated `openapi.json`, and update the matching interface in `frontend/src/types/index.ts`.
4. CI (`.github/workflows/ci.yml`) verifies the same on every push.
