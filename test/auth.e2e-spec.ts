/**
 * End-to-end test for the auth flow + global pipeline.
 *
 * Runs a real Nest application with a stubbed Prisma (in-memory user +
 * refresh-token store). Exercises:
 *   ValidationPipe → JwtAuthGuard → TransformInterceptor → AllExceptionsFilter
 * without requiring a database.
 */

process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'x'.repeat(48);
process.env.DATABASE_URL ??=
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.CORS_ORIGIN ??= 'http://localhost';

import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import {
  MailerService,
  MailMessage,
} from '../src/common/mailer/mailer.service';

interface StoredUser {
  id: string;
  email: string;
  password: string;
  passwordChangedAt: Date;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredRefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

interface StoredAuthToken {
  id: string;
  type: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  userId: string;
  createdAt: Date;
}

function buildPrismaStub() {
  const users = new Map<string, StoredUser>();
  const refreshTokens = new Map<string, StoredRefreshToken>(); // keyed by hash
  const authTokens = new Map<string, StoredAuthToken>(); // keyed by hash
  let userCounter = 0;
  let tokenCounter = 0;
  let authTokenCounter = 0;

  const user = {
    findUnique: jest.fn(
      async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) return users.get(where.id) ?? null;
        if (where.email) {
          for (const u of users.values()) if (u.email === where.email) return u;
        }
        return null;
      },
    ),
    create: jest.fn(
      async ({ data }: { data: { email: string; password: string } }) => {
        for (const u of users.values()) {
          if (u.email === data.email) {
            const { Prisma } = await import('@prisma/client');
            throw new Prisma.PrismaClientKnownRequestError('dup', {
              code: 'P2002',
              clientVersion: 'test',
              meta: { target: ['email'] },
            });
          }
        }
        userCounter += 1;
        const now = new Date();
        const u: StoredUser = {
          id: `u${userCounter}`,
          email: data.email,
          password: data.password,
          passwordChangedAt: now,
          emailVerifiedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        users.set(u.id, u);
        return u;
      },
    ),
    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<StoredUser>;
      }) => {
        const existing = users.get(where.id);
        if (!existing) throw new Error('not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        users.set(where.id, updated);
        return updated;
      },
    ),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      const existing = users.get(where.id);
      if (!existing) {
        const { Prisma } = await import('@prisma/client');
        throw new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        });
      }
      for (const [hash, t] of refreshTokens) {
        if (t.userId === where.id) refreshTokens.delete(hash);
      }
      for (const [hash, t] of authTokens) {
        if (t.userId === where.id) authTokens.delete(hash);
      }
      users.delete(where.id);
      return existing;
    }),
  };

  const authToken = {
    create: jest.fn(
      async ({
        data,
      }: {
        data: {
          userId: string;
          type: string;
          tokenHash: string;
          expiresAt: Date;
        };
      }) => {
        authTokenCounter += 1;
        const row: StoredAuthToken = {
          id: `at${authTokenCounter}`,
          type: data.type,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          usedAt: null,
          userId: data.userId,
          createdAt: new Date(),
        };
        authTokens.set(data.tokenHash, row);
        return row;
      },
    ),
    findUnique: jest.fn(
      async ({ where }: { where: { tokenHash?: string; id?: string } }) => {
        if (where.tokenHash) return authTokens.get(where.tokenHash) ?? null;
        if (where.id) {
          for (const t of authTokens.values()) if (t.id === where.id) return t;
        }
        return null;
      },
    ),
    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id?: string; tokenHash?: string };
        data: Partial<StoredAuthToken>;
      }) => {
        for (const t of authTokens.values()) {
          if (
            (where.id && t.id === where.id) ||
            (where.tokenHash && t.tokenHash === where.tokenHash)
          ) {
            const updated = { ...t, ...data };
            authTokens.set(t.tokenHash, updated);
            return updated;
          }
        }
        const { Prisma } = await import('@prisma/client');
        throw new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        });
      },
    ),
    // Backs the atomic single-use consume(): only stamps a row matching
    // tokenHash + type that is still unused and unexpired.
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: {
          tokenHash?: string;
          type?: string;
          usedAt?: Date | null;
          expiresAt?: { gt?: Date };
        };
        data: Partial<StoredAuthToken>;
      }) => {
        const now = where.expiresAt?.gt ?? new Date();
        let count = 0;
        for (const t of authTokens.values()) {
          if (
            (where.tokenHash === undefined ||
              t.tokenHash === where.tokenHash) &&
            (where.type === undefined || t.type === where.type) &&
            (where.usedAt !== null || t.usedAt === null) &&
            (where.expiresAt?.gt === undefined || t.expiresAt > now)
          ) {
            authTokens.set(t.tokenHash, { ...t, ...data });
            count += 1;
          }
        }
        return { count };
      },
    ),
  };

  const refreshToken = {
    create: jest.fn(
      async ({
        data,
      }: {
        data: { userId: string; tokenHash: string; expiresAt: Date };
      }) => {
        tokenCounter += 1;
        const row: StoredRefreshToken = {
          id: `rt${tokenCounter}`,
          tokenHash: data.tokenHash,
          userId: data.userId,
          expiresAt: data.expiresAt,
          revokedAt: null,
          createdAt: new Date(),
        };
        refreshTokens.set(data.tokenHash, row);
        return row;
      },
    ),
    findUnique: jest.fn(
      async ({ where }: { where: { tokenHash?: string; id?: string } }) => {
        if (where.tokenHash) return refreshTokens.get(where.tokenHash) ?? null;
        if (where.id) {
          for (const t of refreshTokens.values())
            if (t.id === where.id) return t;
        }
        return null;
      },
    ),
    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id?: string; tokenHash?: string };
        data: Partial<StoredRefreshToken>;
      }) => {
        for (const [hash, t] of refreshTokens) {
          if (
            (where.id && t.id === where.id) ||
            (where.tokenHash && hash === where.tokenHash)
          ) {
            const updated = { ...t, ...data };
            refreshTokens.set(hash, updated);
            return updated;
          }
        }
        const { Prisma } = await import('@prisma/client');
        throw new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        });
      },
    ),
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id?: string; revokedAt?: Date | null };
        data: Partial<StoredRefreshToken>;
      }) => {
        let count = 0;
        for (const [hash, t] of refreshTokens) {
          const matchId = !where.id || t.id === where.id;
          const matchRevoked =
            where.revokedAt === null ? t.revokedAt === null : true;
          if (matchId && matchRevoked) {
            refreshTokens.set(hash, { ...t, ...data });
            count += 1;
          }
        }
        return { count };
      },
    ),
    delete: jest.fn(
      async ({ where }: { where: { id?: string; tokenHash?: string } }) => {
        for (const [hash, t] of refreshTokens) {
          if (
            (where.id && t.id === where.id) ||
            (where.tokenHash && hash === where.tokenHash)
          ) {
            refreshTokens.delete(hash);
            return t;
          }
        }
        // Prisma throws P2025 when no rows match
        const { Prisma } = await import('@prisma/client');
        throw new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        });
      },
    ),
    deleteMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
      let count = 0;
      for (const [hash, t] of refreshTokens) {
        if (t.userId === where.userId) {
          refreshTokens.delete(hash);
          count += 1;
        }
      }
      return { count };
    }),
  };

  const stub = {
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
    user,
    refreshToken,
    authToken,
    // Supports both transaction shapes: the array form (await each op) and the
    // interactive callback form used by AuthTokensService.consume.
    $transaction: jest.fn(async (input: unknown) => {
      if (typeof input === 'function') {
        return (input as (tx: typeof stub) => Promise<unknown>)(stub);
      }
      return Promise.all(input as Promise<unknown>[]);
    }),
    _users: users,
    _refreshTokens: refreshTokens,
    _authTokens: authTokens,
  };
  return stub;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prismaStub: ReturnType<typeof buildPrismaStub>;
  // Captures every email the app "sends" so tests can read the reset/verify
  // token straight out of the link (the plaintext is never persisted).
  const sentEmails: MailMessage[] = [];

  /** Pulls the `?token=...` value out of the most recent matching email. */
  function tokenFromLastEmail(predicate: (m: MailMessage) => boolean): string {
    const msg = [...sentEmails].reverse().find(predicate);
    if (!msg) throw new Error('no matching email captured');
    const match = msg.text.match(/token=([^\s]+)/);
    if (!match) throw new Error('no token in email');
    return match[1];
  }

  beforeAll(async () => {
    prismaStub = buildPrismaStub();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(MailerService)
      .useValue({
        send: jest.fn(async (msg: MailMessage) => {
          sentEmails.push(msg);
        }),
      })
      .compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(PinoLogger));

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(
      new TransformInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    app.useGlobalFilters(
      new AllExceptionsFilter(app.get(HttpAdapterHost), app.get(ConfigService)),
    );

    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /auth/register', () => {
    it('returns the envelope with an access token, refresh token, and user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'alice@example.com', password: 'StrongPass!1' })
        .expect(201);

      expect(res.body).toMatchObject({
        success: true,
        data: {
          user: { email: 'alice@example.com' },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });
      expect(res.body.data.refreshToken.length).toBeGreaterThan(20);
      expect(JSON.stringify(res.body)).not.toMatch(/"password"/);
    });

    it('rejects a duplicate email with 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'alice@example.com', password: 'StrongPass!1' })
        .expect(409);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid input with 400 + errors[]', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'x' })
        .expect(400);
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.join(' ')).toMatch(/email/i);
    });

    it('strips unknown fields (whitelist)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'bob@example.com',
          password: 'StrongPass!1',
          isAdmin: true,
        })
        .expect(400);
      expect(res.body.errors.join(' ')).toMatch(/isAdmin/);
    });
  });

  describe('POST /auth/login', () => {
    it('rejects wrong password with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'wrong' })
        .expect(401);
    });

    it('rejects unknown email with the same 401 (no enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever' })
        .expect(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('returns a fresh access + refresh pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'StrongPass!1' })
        .expect(200);

      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dan@example.com', password: 'StrongPass!1' })
        .expect(201);
      refreshToken = res.body.data.refreshToken;
    });

    it('rotates the refresh token and issues a fresh access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
      // Same user
      expect(res.body.data.user.email).toBe('dan@example.com');

      // Update for next test
      refreshToken = res.body.data.refreshToken;
    });

    it('replaying a used refresh token returns 401', async () => {
      // Use it once (works)
      const ok = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      const usedOnce = refreshToken;
      refreshToken = ok.body.data.refreshToken;

      // Replay (fails)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: usedOnce })
        .expect(401);
    });

    it('rejects unknown refresh tokens with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'made-up-token-that-does-not-exist-' + Date.now(),
        })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the refresh token (subsequent refresh fails)', async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'eve@example.com', password: 'StrongPass!1' })
        .expect(201);
      const rt = reg.body.data.refreshToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: rt })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: rt })
        .expect(401);
    });

    it('is idempotent on unknown tokens (200, not 404)', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'never-existed-' + Date.now() })
        .expect(200);
    });
  });

  describe('GET /users/me', () => {
    it('rejects requests without a Bearer token with 401', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('rejects an invalid/malformed JWT with 401', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });

    it('returns the current user when authenticated', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'StrongPass!1' })
        .expect(200);
      const token = login.body.data.accessToken;

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toMatchObject({
        email: 'alice@example.com',
      });
      expect(JSON.stringify(res.body)).not.toMatch(/"password"/);
    });
  });

  describe('POST /users/me/password', () => {
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'carol@example.com', password: 'OldPass123!' })
        .expect(201);
      token = reg.body.data.accessToken;
      userId = reg.body.data.user.id;
    });

    it('rejects wrong current password with 401', async () => {
      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrong', newPassword: 'NewPass456!' })
        .expect(401);
    });

    it('updates the password and the new one works for login', async () => {
      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'OldPass123!', newPassword: 'BrandNew789!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'carol@example.com', password: 'OldPass123!' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'carol@example.com', password: 'BrandNew789!' })
        .expect(200);

      const stored = prismaStub._users.get(userId);
      expect(await bcrypt.compare('BrandNew789!', stored!.password)).toBe(true);
    });
  });

  // ── Phase 3: token invalidation after password change ────────────────────
  describe('Password change → token invalidation', () => {
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'frank@example.com', password: 'OldPw123!' })
        .expect(201);
      token = reg.body.data.accessToken;
      userId = reg.body.data.user.id;
    });

    it('access token issued BEFORE password change is rejected with 401', async () => {
      // Sanity: token works before the change
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // JWT `iat` is in whole seconds — wait at least one full second so the
      // post-change `passwordChangedAt` is strictly greater than `iat`.
      await new Promise((r) => setTimeout(r, 1100));

      await request(app.getHttpServer())
        .post('/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'OldPw123!', newPassword: 'NewPw456!' })
        .expect(200);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it("all of the user's refresh tokens are revoked", async () => {
      const tokensForUser = [...prismaStub._refreshTokens.values()].filter(
        (t) => t.userId === userId,
      );
      expect(tokensForUser).toHaveLength(0);
    });
  });

  // ── Phase 6: password reset + email verification ──────────────────────────
  //
  // One shared `recover@example.com` account is reused across these tests to
  // stay under the per-route 10/min throttle on /auth/register. Its password
  // evolves: PW1 (register) → PW2 (reset) → PW3 (reuse-token test).
  describe('Account recovery', () => {
    const RECOVER = 'recover@example.com';
    const PW1 = 'OldPass123!';
    const PW2 = 'BrandNewPass456!';
    const PW3 = 'FirstNew123!';
    let recoverUserId: string;
    let preResetRefreshToken: string;

    it('forgot-password returns 200 for an unknown email and sends no mail', async () => {
      const before = sentEmails.length;
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'ghost@example.com' })
        .expect(200);

      expect(res.body.data.message).toEqual(expect.any(String));
      expect(sentEmails.length).toBe(before); // nothing emailed
    });

    it('resets the password end-to-end: new password works, old sessions die', async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: RECOVER, password: PW1 })
        .expect(201);
      recoverUserId = reg.body.data.user.id;
      preResetRefreshToken = reg.body.data.refreshToken;

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: RECOVER })
        .expect(200);

      const token = tokenFromLastEmail((m) => m.to === RECOVER);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: PW2 })
        .expect(200);

      // Old password no longer works; the new one does.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: RECOVER, password: PW1 })
        .expect(401);
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: RECOVER, password: PW2 })
        .expect(200);

      // The pre-reset refresh token was invalidated.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: preResetRefreshToken })
        .expect(401);
    });

    it('rejects a reused reset token with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: RECOVER })
        .expect(200);
      const token = tokenFromLastEmail((m) => m.to === RECOVER);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: PW3 })
        .expect(200);

      // Replaying the now-consumed token fails.
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: 'SecondNew123!' })
        .expect(400);
    });

    it('rejects an unknown/garbage reset token with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'not-a-real-token', newPassword: 'Whatever123!' })
        .expect(400);
    });

    it('requires auth to request a verification email', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email/request')
        .expect(401);
    });

    it('verifies the email end-to-end', async () => {
      // Authenticate as the recovered user (current password is PW3).
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: RECOVER, password: PW3 })
        .expect(200);
      const accessToken = login.body.data.accessToken;

      await request(app.getHttpServer())
        .post('/auth/verify-email/request')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const token = tokenFromLastEmail(
        (m) => m.to === RECOVER && /verify-email/.test(m.text),
      );

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token })
        .expect(200);

      expect(
        prismaStub._users.get(recoverUserId)!.emailVerifiedAt,
      ).toBeInstanceOf(Date);
    });
  });

  // ── Phase 6: account deletion ─────────────────────────────────────────────
  describe('DELETE /users/me', () => {
    let accessToken: string;
    let userId: string;

    beforeAll(async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'delete-me@example.com', password: 'StrongPass!1' })
        .expect(201);
      accessToken = reg.body.data.accessToken;
      userId = reg.body.data.user.id;
    });

    it('rejects deletion with the wrong password (401) and keeps the account', async () => {
      await request(app.getHttpServer())
        .delete('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'wrong-password' })
        .expect(401);

      expect(prismaStub._users.get(userId)).toBeDefined();
    });

    it('deletes the account with the correct password', async () => {
      await request(app.getHttpServer())
        .delete('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'StrongPass!1' })
        .expect(200);

      expect(prismaStub._users.get(userId)).toBeUndefined();
    });
  });
});
