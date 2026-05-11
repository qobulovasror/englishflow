# EnglishFlow

A vocabulary-learning platform with spaced repetition, quizzes, and progress tracking. Three coordinated clients share one API:

| Layer | Stack | Path |
|------|-------|------|
| **Backend** | NestJS 10 · Prisma 5 · PostgreSQL 16 · JWT | `src/`, `prisma/` |
| **Web** | Vue 3 · Pinia · Vite · Tailwind | `frontend/` |
| **Mobile** | Flutter 3.2 · Riverpod · Dio · GoRouter | `mobile/` |

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

### Frontend (`frontend/`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run type-check` | `vue-tsc --noEmit` |
| `npm run generate:types` | Generate `src/types/api.ts` from `../openapi.json` |

### Mobile (`mobile/`)

| Command | Purpose |
|---------|---------|
| `flutter run` | Run on a connected device or emulator |
| `flutter analyze` | Static analysis |
| `flutter test` | Run unit tests |

---

## Keeping types in sync

When backend DTOs change, regenerate the API contract for the web client:

```bash
npm run openapi                  # repo root → writes openapi.json
cd frontend && npm run generate:types   # → frontend/src/types/api.ts
```

Generated types are imported via `frontend/src/types/api-helpers.ts`. Hand-written `frontend/src/types/index.ts` still exists for legacy code — migrate incrementally.

The Flutter app does not currently use codegen; its models mirror the backend by convention. Run `flutter test` to catch shape drift early.

---

## Project structure (top level)

```
englishflow/
├── src/                  NestJS backend
│   ├── common/           Filters, interceptors, decorators, guards, DTOs, swagger helpers
│   ├── config/           ConfigModule + Joi env validation
│   ├── modules/          Feature modules (auth, users, words, learning, tests, progress)
│   └── prisma/           PrismaService + module
├── prisma/
│   ├── schema.prisma     Source of truth for the database
│   ├── migrations/       Versioned SQL migrations
│   └── seed.ts           Optional seed script
├── frontend/             Vue 3 web client
├── mobile/               Flutter mobile client
├── scripts/
│   └── export-openapi.ts Headless Swagger export (no DB needed)
├── docker-compose.yml    Postgres + backend
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
| `JWT_EXPIRES_IN` | no | `7d` | Forwarded to `JwtModule.signOptions` |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Comma-separated list allowed |

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

- **Backend**: no test suite yet — see open work in `docs/ARCHITECTURE.md`.
- **Frontend**: type-check via `npm run type-check`.
- **Mobile**: `flutter test` runs unit tests under `mobile/test/`.

---

## Contributing

1. Branch from `main`.
2. Run lint/build/test for the layer you changed.
3. If you change the backend API: `npm run openapi && cd frontend && npm run generate:types` and commit the regenerated `openapi.json` + `frontend/src/types/api.ts`.
4. CI (`.github/workflows/ci.yml`) verifies the same on every push.
