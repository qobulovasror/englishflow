process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'x'.repeat(48);
process.env.DATABASE_URL ??=
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.CORS_ORIGIN ??= 'http://localhost';

import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { CefrLevel } from '@prisma/client';
import * as request from 'supertest';
import { createTestApp, registerUser } from './helpers/test-app';
import type { PrismaStub, StoredDeck } from './helpers/prisma-stub';

describe('Decks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaStub;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  function seedSystemDeck(): StoredDeck {
    const now = new Date();
    const deck: StoredDeck = {
      id: randomUUID(),
      title: 'Travel Essentials',
      description: 'Curated',
      level: CefrLevel.A2,
      isSystem: true,
      isPublic: true,
      createdById: null,
      createdAt: now,
      updatedAt: now,
    };
    prisma._stores.decks.set(deck.id, deck);
    return deck;
  }

  describe('authentication', () => {
    it('POST /decks rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/decks')
        .send({ title: 'x' })
        .expect(401);
    });
  });

  describe('user deck lifecycle', () => {
    let token: string;

    beforeAll(async () => {
      const user = await registerUser(app);
      token = user.accessToken;
    });

    it('create → add words → fetch detail → patch → delete', async () => {
      // Create
      const created = await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'My Deck', description: 'mine', level: CefrLevel.B1 })
        .expect(201);

      expect(created.body.data).toMatchObject({
        title: 'My Deck',
        isSystem: false,
        wordCount: 0,
        isEnrolled: false,
        isOwner: true,
        isPublic: false,
      });
      const deckId = created.body.data.id;

      // Add words
      const added = await request(app.getHttpServer())
        .post(`/decks/${deckId}/words`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          words: [
            { word: 'airport', translation: 'aeroport' },
            { word: 'ticket', translation: 'chipta', example: 'Buy a ticket.' },
          ],
        })
        .expect(201);

      expect(added.body.data).toMatchObject({ addedCount: 2, wordCount: 2 });

      // Fetch detail
      const detail = await request(app.getHttpServer())
        .get(`/decks/${deckId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(detail.body.data.wordCount).toBe(2);
      expect(detail.body.data.words).toHaveLength(2);
      const wordId = detail.body.data.words[0].id;

      // Remove one word
      await request(app.getHttpServer())
        .delete(`/decks/${deckId}/words/${wordId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Patch
      const patched = await request(app.getHttpServer())
        .patch(`/decks/${deckId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Renamed Deck', isPublic: true })
        .expect(200);

      expect(patched.body.data).toMatchObject({
        title: 'Renamed Deck',
        wordCount: 1,
        isOwner: true,
        isPublic: true,
      });

      // Delete (soft): the row is archived, not removed — so enrolled learners
      // keep their progress. It must vanish from listings/detail afterwards.
      await request(app.getHttpServer())
        .delete(`/decks/${deckId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Row still exists but is stamped deletedAt...
      expect(prisma._stores.decks.get(deckId)?.deletedAt).toBeInstanceOf(Date);
      // ...and is no longer reachable via the API.
      await request(app.getHttpServer())
        .get(`/decks/${deckId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('rejects adding words with an empty array (400)', async () => {
      const created = await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Empty test' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/decks/${created.body.data.id}/words`)
        .set('Authorization', `Bearer ${token}`)
        .send({ words: [] })
        .expect(400);
    });

    it('rejects an over-limit word string (400)', async () => {
      const created = await request(app.getHttpServer())
        .post('/decks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Caps test' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/decks/${created.body.data.id}/words`)
        .set('Authorization', `Bearer ${token}`)
        .send({ words: [{ word: 'a'.repeat(201), translation: 'olma' }] })
        .expect(400);
    });
  });

  describe('ownership / system decks', () => {
    let token: string;

    beforeAll(async () => {
      const user = await registerUser(app);
      token = user.accessToken;
    });

    it('PATCH on a system deck returns 403', async () => {
      const sys = seedSystemDeck();
      await request(app.getHttpServer())
        .patch(`/decks/${sys.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'hack' })
        .expect(403);
      expect(prisma._stores.decks.get(sys.id)?.title).toBe('Travel Essentials');
    });

    it('DELETE on a system deck returns 403', async () => {
      const sys = seedSystemDeck();
      await request(app.getHttpServer())
        .delete(`/decks/${sys.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(prisma._stores.decks.has(sys.id)).toBe(true);
    });

    it('PATCH on a non-existent deck returns 404', async () => {
      await request(app.getHttpServer())
        .patch(`/decks/${randomUUID()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'x' })
        .expect(404);
    });
  });
});
