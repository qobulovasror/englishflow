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

\*Currently per-controller via `@UseGuards(JwtAuthGuard)`. `@Public()` decorator exists for the future migration to a global guard.

---

## Request lifecycle

A typical authenticated request (e.g. `POST /learning/review`):

1. **CORS** — preflight against the `CORS_ORIGIN` list from `ConfigService`. `credentials: true` so the web client's auth cookies flow.
2. **`cookie-parser`** — populates `req.cookies` from the `Cookie` header.
3. **ThrottlerGuard** (global `APP_GUARD`) — 120 req/min/IP by default; `/auth/*` is tightened to 10/min via controller-level `@Throttle()`. Excess returns 429 with the standard envelope.
4. **JwtAuthGuard** — extracts `Authorization: Bearer <token>` and verifies via `passport-jwt`. Populates `req.user = { id, email }`. **Also** compares the token's `iat` to `user.passwordChangedAt`; any token issued before the last password change is rejected.
5. **ValidationPipe** (global, `whitelist + forbidNonWhitelisted + transform`) — converts the body to the controller's DTO class and strips unknown fields. Validation errors short-circuit with `BadRequestException`.
6. **LoggingInterceptor** — records method, URL, status, and elapsed time.
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
- If present and **`revokedAt` is set** → token was already used; this is replay → **revoke every refresh token for the user** and 401.
- If expired → delete it and 401.
- Otherwise: delete the old row and create a new token atomically (`$transaction`). Return the new plaintext.

This means a stolen refresh token has at most one successful use before the legitimate user (or attacker) trips the reuse detector and locks them both out.

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

### Authorization (planned)

`@Public()`, `@Roles(...)`, and `RolesGuard` are in place under `src/common/`. The `User` model does not have a `roles` column yet — adding one is a schema change, then `JwtStrategy.validate` would include `roles` on the request user.

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
| `User` | Account | `email @unique`, hashed `password`, `passwordChangedAt`, `createdAt`, `updatedAt` |
| `RefreshToken` | One row per active refresh token | `tokenHash @unique` (SHA-256), `expiresAt`, `revokedAt`, FK→User cascade |
| `Word` | A vocabulary entry owned by one user | `createdById` FK + index |
| `UserWord` | Junction between User and Word with learning state | `status WordStatus`, `repetitionCount`, `lastReviewedAt`. Unique on `(userId, wordId)`. |
| `Test` | A completed quiz session | `score`, FK to user |
| `TestQuestion` | One graded question inside a `Test` | FKs to `test` and `word` |

### Indexes

PostgreSQL does **not** auto-index foreign keys. The schema declares them explicitly:

- `words(createdById)` — `GET /words` list.
- `user_words(wordId)` — cascade deletes, reverse lookup.
- `user_words(status)` — `/learning/daily` filters on `status IN (NEW, LEARNING)`.
- `tests(userId)` — `/progress` aggregate.
- `test_questions(testId)`, `test_questions(wordId)` — cascade + joins.
- `refresh_tokens(userId)` — revoke-all queries on password change / reuse detection.
- `refresh_tokens(expiresAt)` — future cleanup job for expired tokens.

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
- Types are in two places:
  - `src/types/index.ts` — hand-written, legacy.
  - `src/types/api.ts` — auto-generated from `openapi.json`. Use `src/types/api-helpers.ts` for ergonomic aliases.

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
- Mobile **does not** use the cookie — it stores the refresh token in `SharedPreferences` and sends it in the JSON body of `/auth/refresh` and `/auth/logout`. The backend accepts both transports.
- `ApiException` exposes `isValidationError`, `isUnauthorized`, `isConflict`, `isServerError` for ergonomic UI handling.
- Sensitive fields (`password`, `accessToken`, `refreshToken`, `Authorization`) are redacted in logs — and logs only run in debug builds.

---

## Cross-cutting infrastructure

Under `src/common/`:

| Folder | Purpose |
|--------|---------|
| `filters/` | `AllExceptionsFilter` — single error normalizer |
| `interceptors/` | `LoggingInterceptor`, `TransformInterceptor` |
| `decorators/` | `@CurrentUser()`, `@Public()`, `@Roles(...)` |
| `guards/` | `RolesGuard` (infra only — needs `User.roles` to be useful) |
| `dto/` | `PaginationQueryDto`, `PaginatedResponseDto` |
| `utils/` | `paginate(items, total, query)` helper |
| `swagger/` | `ApiSuccessResponse`, `ApiPaginatedResponse`, `ApiErrorResponseDto` — keeps Swagger docs aware of the response envelope |

---

## Testing

| Layer | Tool | Files | What's covered |
|-------|------|-------|----------------|
| Backend unit | Jest + `@nestjs/testing` | `src/**/*.spec.ts` | 6 suites · auth/users/learning services, exception filter, transform interceptor, pagination |
| Backend e2e | Jest + supertest | `test/**/*.e2e-spec.ts` | 5 suites · auth (register/login/refresh/logout/password change + invalidation), rate limiting, words CRUD + ownership, tests grading, progress aggregation |
| Frontend | `vue-tsc --noEmit` | — | Type-check only; UI tests not yet wired |
| Mobile | `flutter test` | `mobile/test/**/*_test.dart` | 5 suites · model parsing, paginated response, API exception normalization |

E2E tests use an in-memory Prisma stub (`test/helpers/prisma-stub.ts`) so they run without a database. The CI workflow (`.github/workflows/ci.yml`) runs all three layers in parallel jobs on every push.

Run from the repo root:

```bash
npm test           # unit
npm run test:e2e   # e2e (use --runInBand if rate-limit interferes)
npm run test:cov   # coverage report
```

---

## Build & deploy

The backend ships as a multi-stage Docker image (see `Dockerfile`):

1. Builder stage: `npm install`, `prisma generate`, `npm run build`.
2. Runtime stage: Node 20 Alpine + OpenSSL + `dist/`, `node_modules/`, `prisma/`. Entrypoint runs `prisma migrate deploy` then `node dist/main`.

`docker-compose.yml` defines Postgres + backend. Backend reads `env_file: .env` — secrets are never baked into the image or compose file.

For production:

1. Provision Postgres (managed service preferred — `DATABASE_URL` points at it).
2. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV=production`.
3. Push the image to your registry.
4. Run the container; `prisma migrate deploy` runs on every boot and is idempotent.
5. Make sure the SPA and API are on the **same site** (eTLD+1) or set `sameSite=none + secure` and add CSRF tokens — otherwise the refresh cookie won't flow.

---

## Known gaps / open work

These are deliberate trade-offs noted for future iterations:

- **Roles / RBAC** — `RolesGuard` exists but `User.roles` does not. Adding it is a schema change.
- **Refresh-token cleanup** — expired rows accumulate; a daily cron/job using the `expiresAt` index would garbage-collect them.
- **Mobile screen tests** — only model and parser tests today; provider/widget tests still missing.
- **Mobile codegen** — Flutter models mirror DTOs by convention. Generating Dart bindings from `openapi.json` would close the loop.
- **Backend coverage** — 32% line coverage today. The hot paths (auth, learning state machine, error normalization) are 90–100%; controllers and pagination are exercised end-to-end. Next priority is broader service coverage.
- **Soft deletes / audit log** — `User` / `Word` deletes cascade hard.
- **Email verification / password reset** — not implemented; both would reuse `passwordChangedAt` to invalidate stale sessions.
- **Account lockout** — throttler slows brute force but doesn't lock the account; add an `auth_failed_attempts` counter on `User` for hard lockout if needed.
