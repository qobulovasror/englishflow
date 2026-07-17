# Architecture

This document explains how the three clients and the backend fit together — what request goes where, what state lives where, and how cross-cutting concerns are wired up.

## System overview

```
┌────────────────┐      ┌──────────────────────────────────────────────┐
│ Vue 3 (web)    │──┐   │  NestJS 10                                   │
└────────────────┘  │   │                                              │
                    │   │  ┌──────────────────┐   ┌──────────────────┐ │   ┌────────────┐
┌────────────────┐  ├──▶│  │ Global pipeline  │──▶│ Feature modules  │─┼──▶│ PostgreSQL │
│ Flutter (mobile)│──┘   │  │ ThrottlerGuard   │   │ auth, users,     │ │   └────────────┘
└────────────────┘      │  │ ValidationPipe   │   │ words, learning, │ │
                        │  │ JwtAuthGuard*    │   │ tests, progress  │ │
                        │  │ Logging          │   └──────────────────┘ │
                        │  │ Transform        │                        │
                        │  │ ClassSerializer  │                        │
                        │  │ AllExceptionsFilter                       │
                        │  └──────────────────┘                        │
                        └──────────────────────────────────────────────┘
```

\*`JwtAuthGuard` is registered globally as an `APP_GUARD` (see `src/app.module.ts`); endpoints opt out with the `@Public()` decorator (used by `/auth/*` and `/health`).

---

## Request lifecycle

A typical authenticated request (e.g. `POST /learning/review`):

1. **CORS** — preflight against the `CORS_ORIGIN` list from `ConfigService`. `credentials: true` so the web client's auth cookies flow.
2. **`cookie-parser`** — populates `req.cookies` from the `Cookie` header.
3. **ThrottlerGuard** (global `APP_GUARD`) — 120 req/min/IP by default; `/auth/*` is tightened to 10/min via controller-level `@Throttle()`. Excess returns 429 with the standard envelope.
4. **JwtAuthGuard** (global `APP_GUARD`, bypassed by `@Public()`) — extracts `Authorization: Bearer <token>` and verifies via `passport-jwt`. Populates `req.user = { id, email, role }` (role read fresh from the DB). **Also** compares the token's `iat` to `user.passwordChangedAt`; any token issued before the last password change is rejected. `@Roles(Role.ADMIN)` + `RolesGuard` then gate the `/admin/*` endpoints.
5. **ValidationPipe** (global, `whitelist + forbidNonWhitelisted + transform`) — converts the body to the controller's DTO class and strips unknown fields. Validation errors short-circuit with `BadRequestException`.
6. **pino (nestjs-pino)** — auto-logs the completed request as one structured line (`req.id`, method, url, status, responseTime). Each request carries an `x-request-id` (reused from upstream or minted) echoed back on the response header; `/health*` probes are excluded.
7. **Controller** — pulls `@CurrentUser()` from `req.user`, invokes the service.
8. **Service** — does the work; for read endpoints calls Prisma, for writes wraps state transitions in `$transaction` where needed.
9. **Return value** — services return DTO instances built via `plainToInstance(Dto, raw, { excludeExtraneousValues: true })`. Only `@Expose()`-marked fields survive serialization.
10. **ClassSerializerInterceptor** — turns the DTO instance back into a plain object respecting `@Expose()` / `@Exclude()`.
11. **TransformInterceptor** — wraps the plain object in `{ success: true, data, timestamp }`.
12. **Express** — sends the response.

If anything throws:

- **AllExceptionsFilter** catches it.
- `HttpException` → uses status and message.
- `Prisma.PrismaClientKnownRequestError` → mapped: `P2002` → 409, `P2025` → 404, `P2003` → 400.
- `ThrottlerException` → 429.
- Validation pipe array messages → surfaced as `errors[]`.
- Unknown → 500 with stack hidden in production.
- Result is `{ success: false, statusCode, message, error, errors?, path, timestamp }`.

---

## Authentication

Two-token JWT design with refresh-token rotation.

### Tokens

| Token | Lifetime | Where it lives | Purpose |
|-------|----------|----------------|---------|
| **Access token** | 15 min (`JWT_EXPIRES_IN`) | `Authorization: Bearer` header | Authorizes every protected request. Stateless, signed `HS256`. |
| **Refresh token** | 30 days (`REFRESH_TOKEN_EXPIRES_IN_DAYS`) | `httpOnly` cookie (web), JSON body (mobile) | Single-use; rotated on every `/auth/refresh` call. Hash-only in DB. |

### Sign-in flow

1. Client POSTs `/auth/login` with credentials.
2. Backend issues access token (JWT) **and** refresh token (256-bit base64url).
3. Refresh token is stored hashed (`sha256`) in `refresh_tokens`. The plaintext is returned to the client AND set as an `httpOnly`, `secure` (in prod), `sameSite=lax`, `path=/auth` cookie.
4. Client uses access token for API calls until it expires.
5. On 401, client calls `/auth/refresh` — backend reads refresh token from cookie (web) or body (mobile), rotates it, returns a new pair.

### Rotation and reuse detection

`RefreshTokensService.rotate()` is the security-critical method:

- Hashes the incoming token and looks it up.
- If missing → 401 (unknown token).
- If present and **`revokedAt` is set** → token was already rotated; this is replay → **revoke every refresh token for the user** and 401.
- If expired → delete it and 401.
- Otherwise: **soft-revoke** the old row (stamp `revokedAt`) and create a new token atomically (`$transaction`). Return the new plaintext.

Keeping the rotated row (rather than deleting it) is what makes reuse detection real: a replay of an already-rotated token is recognised as reuse and trips the chain-wide revocation, instead of looking like a generic unknown token. The nightly `CleanupService` purges revoked/expired rows. So a stolen refresh token has at most one successful use before the legitimate user (or attacker) trips the detector and locks them both out.

### Password change invalidation (defense in depth)

`POST /users/me/password` does three things atomically:

1. Updates `password` to the new bcrypt hash.
2. Bumps `passwordChangedAt = now()`.
3. Deletes every `refresh_tokens` row for the user.

`JwtStrategy.validate` then rejects access tokens whose `iat` is before `passwordChangedAt`. Even within the 15-min access-token window, password change kicks the user out everywhere.

### httpOnly cookie storage (web)

Web clients never see the refresh token in JS:

- Backend sets `refresh_token` as `httpOnly` cookie on register/login/refresh.
- Cookie config: `httpOnly`, `secure` (only when `NODE_ENV=production`), `sameSite=lax`, `path=/auth` (so only the `/auth/*` endpoints receive it), `maxAge` matching the refresh lifetime.
- The access token still lives in JS (in Pinia state, not localStorage). On a page reload it is lost — the boot routine calls `/auth/refresh`, the cookie comes along automatically, and the session is restored without an extra prompt.
- Both `/auth/refresh` and `/auth/logout` accept the token from **either** the cookie or the JSON body, so mobile (no cookie jar) keeps working unchanged.

`sameSite=lax` provides CSRF protection out of the box for cross-origin POSTs as long as the SPA and API are same-site (eTLD+1). For unrelated origins, switch to `sameSite=none + secure` and add an explicit CSRF token.

### Authorization (RBAC)

Implemented. `User.role` is a `Role` enum (`USER` | `ADMIN`, default `USER`). `JwtStrategy.validate` reads the current role from the DB on every request, so a demotion takes effect immediately. `@Roles(Role.ADMIN)` + `RolesGuard` protect the `/admin/*` content-moderation endpoints (deck/word management). The last-admin-standing case is guarded inside serializable transactions so an admin can't strip the final admin.

---

## Data layer

Database is PostgreSQL 16. The schema is Prisma-managed under `prisma/schema.prisma`. Every change goes through a migration:

```bash
# Locally, against a real DB:
npm run prisma:migrate:dev -- --name <change>

# On deploy:
npm run prisma:migrate   # = prisma migrate deploy
```

### Models

| Model | Purpose | Notable columns |
|-------|---------|----------------|
| `User` | Account | `email @unique`, hashed `password`, `role Role`, `passwordChangedAt`, `level CefrLevel?`, `onboardedAt?`, `emailVerifiedAt?`, `dailyGoal` |
| `RefreshToken` | One row per refresh token (kept after rotation until revoked/expired) | `tokenHash @unique` (SHA-256), `expiresAt`, `revokedAt`, FK→User cascade |
| `AuthToken` | Single-use email tokens (`PASSWORD_RESET`, `EMAIL_VERIFY`) | `type`, `tokenHash @unique` (SHA-256), `expiresAt`, `usedAt` |
| `Word` | A vocabulary entry | `createdById?` FK, `deckId?` FK, `audioUrl?` |
| `Deck` | A curated (system) or user-built collection of words | `isSystem`, `isPublic`, `level?`, `createdById?` |
| `DeckEnrollment` | Tracks which decks a user joined | unique `(userId, deckId)` |
| `UserWord` | Per-user learning state for a word (SM-2) | `status WordStatus`, `repetitionCount`, `easeFactor`, `interval`, `nextReviewAt`, `lapses`, `lastReviewedAt`; unique `(userId, wordId)` |
| `Review` | Append-only log of each grading action (powers streaks/trends) | `rating ReviewRating`, `createdAt`, FKs→User/Word |
| `Test` | A quiz session | `score`, `submittedAt?` (null while in progress; set once at submit) |
| `TestQuestion` | One graded question inside a `Test` | `correctAnswer` (server-only key), `selectedAnswer?`, FKs to `test` and `word` |

### Indexes

PostgreSQL does **not** auto-index foreign keys. The schema declares them explicitly:

- `words(createdById)`, `words(deckId)` — list + deck lookups.
- `user_words(wordId)` — cascade deletes, reverse lookup.
- `user_words(status)` and `user_words(userId, nextReviewAt)` — `/learning/daily` due/new filtering.
- `reviews(userId, createdAt)` — streak/trend windows.
- `deck_enrollments(deckId)` + unique `(userId, deckId)`.
- `tests(userId)` — `/progress` aggregate.
- `test_questions(testId)`, `test_questions(wordId)` — cascade + joins.
- `auth_tokens(userId)` — recovery-token lookups.
- `refresh_tokens(userId)` — revoke-all on password change / reuse detection.
- `refresh_tokens(expiresAt)` — used by the nightly `CleanupService` purge.

### `@updatedAt`

Prisma manages `updatedAt` at the ORM level (every write touches it). The migration adds `DEFAULT CURRENT_TIMESTAMP` on the columns so existing rows are valid against `NOT NULL`.

---

## Response envelope

| Body | Where | Shape |
|------|-------|-------|
| Success | `TransformInterceptor` | `{ success: true, data, timestamp }` |
| Paginated success | services using `paginate()` | `{ success: true, data: { items, total, page, limit, hasMore }, timestamp }` |
| Error | `AllExceptionsFilter` | `{ success: false, statusCode, message, error, errors?, path, timestamp }` |

The frontend axios interceptor and the Flutter `ResponseUnwrapInterceptor` both **unwrap `data`** so service-layer code sees the inner payload directly.

---

## Configuration

`src/config/env.validation.ts` is the single source of truth — `joi` schema. The app refuses to boot if validation fails (e.g. `JWT_SECRET` shorter than 32 chars). Defaults live in `src/config/configuration.ts` and are accessed via `ConfigService.getOrThrow<...>('app' | 'jwt' | 'database')`.

| Variable | Default | Notes |
|----------|---------|-------|
| `JWT_SECRET` | — (required) | ≥ 32 chars |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | `30` | Refresh token lifetime |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated list |
| `NODE_ENV` | `development` | Toggles Swagger, `secure` cookies, 500-stack visibility |

Swagger is only mounted in non-production (`/docs`). Production deployments do not expose API docs by default — gate this with a separate env var if staging needs them.

---

## Frontend (Vue 3) data flow

```
Component  →  Pinia store action  →  service (axios)  →  api.ts interceptor (unwrap)  →  backend
                ↑                                                                            ↓
                └─── reactive state ←── DTO ←── unwrap ←─── { success, data } ←──────────────┘
```

- Pinia stores hold per-feature state; the auth store also doubles as the profile store (it owns `user`, `fetchMe`, `updateProfile`, `changePassword`).
- `extractErrorMessage()` in `services/api.ts` reads the normalized error envelope.
- **Token storage**: access token lives in Pinia state (memory) — never `localStorage`. The refresh token lives in an `httpOnly` cookie that the browser sends automatically; JS cannot read it. On app boot the auth store calls `/auth/refresh`; the cookie restores the session if it's still valid.
- **Silent refresh on 401**: the axios response interceptor catches 401, hits `/auth/refresh` once, retries the original request with the new access token. Concurrent 401s share a single in-flight refresh promise.
- Types are in two places, and the migration between them is unfinished:
  - `src/types/index.ts` — hand-written; **this is what the app currently imports**.
  - `src/types/api.ts` (+ `api-helpers.ts`) — auto-generated from `openapi.json`, but not yet consumed by call sites. Regenerate on API change to prevent drift; migrate imports over incrementally.

---

## Mobile (Flutter) data flow

```
Screen (Consumer)  →  StateNotifier  →  service  →  Dio interceptor chain  →  backend
                                                       ↑
                                                       │  AuthInterceptor       (Bearer)
                                                       │  ResponseUnwrapInterceptor (envelope)
                                                       │  RefreshInterceptor    (401 → rotate → retry)
                                                       │  ErrorInterceptor      (DioException → ApiException)
                                                       │  SafeLogInterceptor    (debug-only, redacted)
```

- All providers are Riverpod `StateNotifierProvider`s.
- The auth state holds `UserModel`, access token, and refresh token. `tryAutoLogin()` rehydrates from `TokenStorage` on splash.
- Mobile **does not** use the cookie — it stores the access + refresh tokens in `flutter_secure_storage` (Keychain on iOS, `encryptedSharedPreferences` on Android) and sends the refresh token in the JSON body of `/auth/refresh` and `/auth/logout`. The backend accepts both transports.
- When a refresh fails (token rejected/expired), the `RefreshInterceptor` both clears storage **and** signals the auth notifier, so the router redirects to `/login` instead of stranding the user on a screen that keeps 401-ing.
- `ApiException` exposes `isValidationError`, `isUnauthorized`, `isConflict`, `isServerError` for ergonomic UI handling.
- Sensitive fields (`password`, `accessToken`, `refreshToken`, `Authorization`) are redacted in logs — and logs only run in debug builds.

---

## Cross-cutting infrastructure

Under `src/common/`:

| Folder | Purpose |
|--------|---------|
| `filters/` | `AllExceptionsFilter` — single error normalizer |
| `interceptors/` | `TransformInterceptor` (response envelope) |
| `logger/` | `buildLoggerParams` — nestjs-pino config (JSON logs, request id, redaction) |
| `decorators/` | `@CurrentUser()`, `@Public()`, `@Roles(...)` |
| `guards/` | `RolesGuard` — enforces `@Roles(Role.ADMIN)` against `User.role` |
| `dto/` | `PaginationQueryDto`, `PaginatedResponseDto` |
| `utils/` | `paginate(items, total, query)` helper |
| `swagger/` | `ApiSuccessResponse`, `ApiPaginatedResponse`, `ApiErrorResponseDto` — keeps Swagger docs aware of the response envelope |

---

## Testing

| Layer | Tool | Files | What's covered |
|-------|------|-------|----------------|
| Backend unit | Jest + `@nestjs/testing` | `src/**/*.spec.ts` | ~29 suites (~226 tests) · services (auth/refresh/users/words/learning/tests/progress/decks/admin/maintenance), SM-2 + streak + trend utils, exception filter, transform interceptor, pagination, guards |
| Backend e2e | Jest + supertest | `test/**/*.e2e-spec.ts` | 8 suites (~82 tests) · auth + refresh rotation/reuse, rate limiting, words CRUD + ownership, decks, tests grading, progress/trends/decks/leeches, admin |
| Backend migrations | Prisma + real Postgres (CI) | `prisma/migrations/` | CI `migrations` job applies every migration to a fresh Postgres 16 and checks `migrate status` |
| Frontend | `vue-tsc --noEmit` | — | Type-check only; UI tests not yet wired |
| Mobile | `flutter analyze` + `flutter test` | `mobile/test/**/*_test.dart` | ~83 tests · models, providers, widgets, paginated response, API exception |
| Extension | `vue-tsc --noEmit` | — | Type-check only (`npm run compile`) |

Jest e2e tests use an in-memory Prisma stub (`test/helpers/prisma-stub.ts`) so they run without a database; the CI `migrations` job is what exercises real Postgres. The CI workflow (`.github/workflows/ci.yml`) runs the backend, migrations, frontend, and mobile jobs in parallel on every push.

Run from the repo root:

```bash
npm test           # unit
npm run test:e2e   # e2e (use --runInBand if rate-limit interferes)
npm run test:cov   # coverage report
```

---

## Build & deploy

The backend ships as a multi-stage Docker image (see `Dockerfile`):

1. Builder stage: `npm ci`, `prisma generate`, `npm run build`, then `npm prune --omit=dev`.
2. Runtime stage: Node 20 Alpine + OpenSSL + `tini` + non-root `app` user + `dist/`, pruned `node_modules/`, `prisma/`. A `HEALTHCHECK` polls `/health`. Entrypoint runs `prisma migrate deploy` then `node dist/main`. The `prisma` CLI is a **production** dependency so the migrate step uses the bundled binary (no registry fetch at boot); for zero-downtime rollouts prefer running migrations as a separate pre-deploy step.

`docker-compose.yml` defines Postgres + backend + web (nginx). Backend reads `env_file: .env` — secrets are never baked into the image or compose file; Postgres is bound to `127.0.0.1`.

For production:

1. Provision Postgres (managed service preferred — `DATABASE_URL` points at it).
2. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production`.
3. Push the image to your registry.
4. Run the container; `prisma migrate deploy` runs on every boot and is idempotent.
5. Make sure the SPA and API are on the **same site** (eTLD+1) or set `sameSite=none + secure` and add CSRF tokens — otherwise the refresh cookie won't flow.

---

## Known gaps / open work

Now-implemented (previously listed here): RBAC (`User.role` + `RolesGuard` + `/admin/*`), refresh-token cleanup cron, email verification + password reset (both reuse `passwordChangedAt`), and mobile provider/widget tests. Backend coverage is now ~80%+.

Still open (see `docs/AUDIT.md` for the full, severity-ranked backlog):

- **Soft deletes / audit log** — `User` / `Deck` / `Word` deletes cascade hard; deleting a shared deck erases enrolled users' `UserWord`/`Review` rows. `DecksService.remove` now blocks deleting a deck other users are enrolled in as a stopgap; full soft-delete is pending.
- **ESLint / Prettier** — scripts reference them but they aren't installed or wired into CI.
- **Structured logging / error tracking** — plain-text Nest logger; no JSON logs, metrics, or Sentry yet.
- **Real-DB e2e** — Jest e2e run against an in-memory stub; only the CI `migrations` job touches real Postgres.
- **Web dual type system** — hand-written `types/index.ts` not yet replaced by the generated `api.ts`.
- **Mobile codegen / offline sync** — Flutter models mirror DTOs by convention; no offline review queue.
- **Account lockout** — throttler slows brute force but doesn't lock the account.
- **Timezone-aware analytics** — progress/trends accept a `tzOffsetMinutes` param (default UTC); clients must send it to get local-day streaks.
