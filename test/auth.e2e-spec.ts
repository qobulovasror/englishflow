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
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

interface StoredUser {
  id: string;
  email: string;
  password: string;
  passwordChangedAt: Date;
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

function buildPrismaStub() {
  const users = new Map<string, StoredUser>();
  const refreshTokens = new Map<string, StoredRefreshToken>(); // keyed by hash
  let userCounter = 0;
  let tokenCounter = 0;

  const user = {
    findUnique: jest.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) return users.get(where.id) ?? null;
      if (where.email) {
        for (const u of users.values()) if (u.email === where.email) return u;
      }
      return null;
    }),
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
          for (const t of refreshTokens.values()) if (t.id === where.id) return t;
        }
        return null;
      },
    ),
    delete: jest.fn(
      async ({ where }: { where: { id?: string; tokenHash?: string } }) => {
        for (const [hash, t] of refreshTokens) {
          if ((where.id && t.id === where.id) || (where.tokenHash && hash === where.tokenHash)) {
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

  return {
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
    user,
    refreshToken,
    // $transaction with an array form: just await each promise sequentially.
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    _users: users,
    _refreshTokens: refreshTokens,
  };
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prismaStub: ReturnType<typeof buildPrismaStub>;

  beforeAll(async () => {
    prismaStub = buildPrismaStub();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
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
    let originalAccessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dan@example.com', password: 'StrongPass!1' })
        .expect(201);
      refreshToken = res.body.data.refreshToken;
      originalAccessToken = res.body.data.accessToken;
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
        .send({ refreshToken: 'made-up-token-that-does-not-exist-' + Date.now() })
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

    it('all of the user\'s refresh tokens are revoked', async () => {
      const tokensForUser = [...prismaStub._refreshTokens.values()].filter(
        (t) => t.userId === userId,
      );
      expect(tokensForUser).toHaveLength(0);
    });
  });
});
