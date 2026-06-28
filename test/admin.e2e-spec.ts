process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'x'.repeat(48);
process.env.DATABASE_URL ??=
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.CORS_ORIGIN ??= 'http://localhost';

import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as request from 'supertest';
import { createTestApp, registerUser } from './helpers/test-app';
import type { PrismaStub } from './helpers/prisma-stub';

describe('Admin decks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaStub;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  // Registers a user, then elevates them to ADMIN in the store. The JWT is read
  // fresh on every request (JwtStrategy.validate → findById), so the role takes
  // effect immediately.
  async function registerAdmin() {
    const user = await registerUser(app);
    const stored = prisma._stores.users.get(user.userId);
    if (stored) stored.role = Role.ADMIN;
    return user;
  }

  describe('POST /admin/decks', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/admin/decks')
        .send({ title: 'x' })
        .expect(401);
    });

    it('returns 403 for a normal (non-admin) user', async () => {
      const user = await registerUser(app);

      await request(app.getHttpServer())
        .post('/admin/decks')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ title: 'Curated Deck' })
        .expect(403);
    });

    it('returns 201 and a system deck for an admin user', async () => {
      const admin = await registerAdmin();

      const res = await request(app.getHttpServer())
        .post('/admin/decks')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ title: 'Curated Deck' })
        .expect(201);

      expect(res.body.data).toMatchObject({
        title: 'Curated Deck',
        isSystem: true,
        wordCount: 0,
      });
      const stored = prisma._stores.decks.get(res.body.data.id);
      expect(stored?.isSystem).toBe(true);
      expect(stored?.isPublic).toBe(true);
      expect(stored?.createdById).toBeNull();
    });
  });

  describe('admin word + delete management', () => {
    it('admin can add words to and delete any deck', async () => {
      const admin = await registerAdmin();

      const created = await request(app.getHttpServer())
        .post('/admin/decks')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ title: 'Manageable' })
        .expect(201);
      const deckId = created.body.data.id;

      const added = await request(app.getHttpServer())
        .post(`/admin/decks/${deckId}/words`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ words: [{ word: 'apple', translation: 'olma' }] })
        .expect(201);
      expect(added.body.data).toMatchObject({ addedCount: 1, wordCount: 1 });

      await request(app.getHttpServer())
        .delete(`/admin/decks/${deckId}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);
      expect(prisma._stores.decks.has(deckId)).toBe(false);
    });

    it('returns 404 when admin deletes a non-existent deck', async () => {
      const admin = await registerAdmin();

      await request(app.getHttpServer())
        .delete(`/admin/decks/${randomUUID()}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(404);
    });

    it('returns 403 when a normal user tries to delete a deck', async () => {
      const user = await registerUser(app);

      await request(app.getHttpServer())
        .delete(`/admin/decks/${randomUUID()}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });
});
