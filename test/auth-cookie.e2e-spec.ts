/**
 * E2E tests for the cookie-based refresh flow. Verifies that:
 *   - register/login set a `refresh_token` httpOnly cookie with the right
 *     attributes (httpOnly, SameSite=Lax, Path=/auth, ...)
 *   - /auth/refresh works with ONLY the cookie (web case)
 *   - /auth/refresh still works with the body token (mobile fallback)
 *   - /auth/logout clears the cookie and revokes the token
 */

process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'x'.repeat(48);
process.env.DATABASE_URL ??=
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.CORS_ORIGIN ??= 'http://localhost';

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './helpers/test-app';
import type { PrismaStub } from './helpers/prisma-stub';

interface ParsedCookie {
  value: string;
  attrs: Record<string, string | true>;
}

function parseCookie(raw: string): ParsedCookie {
  const [first, ...rest] = raw.split(';').map((s) => s.trim());
  const [, value = ''] = first.split('=');
  const attrs: Record<string, string | true> = {};
  for (const part of rest) {
    const [k, v] = part.split('=');
    attrs[k.toLowerCase()] = v ?? true;
  }
  return { value, attrs };
}

function getRefreshCookie(res: request.Response): ParsedCookie | undefined {
  const setCookie = res.headers['set-cookie'] as string[] | undefined;
  if (!setCookie) return undefined;
  const raw = setCookie.find((c) => c.startsWith('refresh_token='));
  return raw ? parseCookie(raw) : undefined;
}

describe('Auth cookie flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaStub;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('cookie attributes', () => {
    it('register sets refresh_token as httpOnly, SameSite=Lax, Path=/auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'web-1@example.com', password: 'StrongPass!1' })
        .expect(201);

      const cookie = getRefreshCookie(res);
      expect(cookie).toBeDefined();
      expect(cookie!.value.length).toBeGreaterThan(20);
      expect(cookie!.attrs.httponly).toBe(true);
      expect(String(cookie!.attrs.samesite).toLowerCase()).toBe('lax');
      expect(cookie!.attrs.path).toBe('/auth');
      // No `secure` in NODE_ENV=test (matches dev)
      expect(cookie!.attrs.secure).toBeUndefined();
    });

    it('login sets the cookie too', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'web-1@example.com', password: 'StrongPass!1' })
        .expect(200);

      expect(getRefreshCookie(res)).toBeDefined();
    });
  });

  describe('refresh via cookie (web client)', () => {
    let agent: ReturnType<typeof request.agent>;

    beforeAll(async () => {
      // `request.agent` persists cookies across requests, like a browser.
      agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/register')
        .send({ email: 'web-2@example.com', password: 'StrongPass!1' })
        .expect(201);
    });

    it('rotates the refresh token using only the cookie (empty body)', async () => {
      const res = await agent
        .post('/auth/refresh')
        .send({}) // no refreshToken in body
        .expect(200);

      expect(res.body.data.accessToken).toEqual(expect.any(String));
      // The response still contains the refresh token in JSON (mobile compat),
      // but a new cookie was also set.
      expect(getRefreshCookie(res)).toBeDefined();
    });

    it('returns 401 when neither cookie nor body has a token', async () => {
      // Fresh request (no agent → no cookies)
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401);
      expect(res.body.message).toMatch(/refresh token/i);
    });
  });

  describe('refresh via body (mobile client)', () => {
    it('still works when the cookie is absent and refreshToken is in body', async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'mobile-1@example.com', password: 'StrongPass!1' })
        .expect(201);
      const refreshToken = reg.body.data.refreshToken;

      // No cookies — bare request
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });
  });

  describe('logout', () => {
    it('clears the cookie and revokes the underlying token', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/register')
        .send({ email: 'web-3@example.com', password: 'StrongPass!1' })
        .expect(201);

      // Find the user's refresh token in the stub (cookie value matches the
      // plaintext, then we look up by hash via the agent's next call).
      const tokensBeforeLogout = [
        ...prisma._stores.refreshTokens.values(),
      ].filter((t) =>
        [...prisma._stores.users.values()].some(
          (u) => u.id === t.userId && u.email === 'web-3@example.com',
        ),
      );
      expect(tokensBeforeLogout.length).toBeGreaterThan(0);

      const res = await agent.post('/auth/logout').send({}).expect(200);

      const setCookie = res.headers['set-cookie'] as string[] | undefined;
      expect(setCookie?.some((c) => c.startsWith('refresh_token=;'))).toBe(
        true,
      );

      const tokensAfter = [...prisma._stores.refreshTokens.values()].filter(
        (t) =>
          [...prisma._stores.users.values()].some(
            (u) => u.id === t.userId && u.email === 'web-3@example.com',
          ),
      );
      expect(tokensAfter).toHaveLength(0);

      // Subsequent refresh via the now-cleared cookie fails
      await agent.post('/auth/refresh').send({}).expect(401);
    });

    it('is idempotent when called without a token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({})
        .expect(200);
    });
  });
});
