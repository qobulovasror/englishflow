process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'x'.repeat(48);
process.env.DATABASE_URL ??=
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.CORS_ORIGIN ??= 'http://localhost';

import { INestApplication } from '@nestjs/common';
import { WordStatus } from '@prisma/client';
import * as request from 'supertest';
import { createTestApp, registerUser } from './helpers/test-app';
import type { PrismaStub } from './helpers/prisma-stub';

describe('Words (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaStub;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('authentication', () => {
    it('GET /words rejects unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/words').expect(401);
    });

    it('POST /words rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/words')
        .send({ word: 'a', translation: 'b' })
        .expect(401);
    });
  });

  describe('CRUD', () => {
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const user = await registerUser(app);
      token = user.accessToken;
      userId = user.userId;
    });

    it('POST /words creates a word and a user-word link', async () => {
      const res = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${token}`)
        .send({
          word: 'serendipity',
          translation: 'kutilmagan kashfiyot',
          example: 'A serendipitous find.',
        })
        .expect(201);

      expect(res.body.data).toMatchObject({
        word: 'serendipity',
        translation: 'kutilmagan kashfiyot',
        example: 'A serendipitous find.',
      });

      // Side effect: a UserWord row exists for this user + word.
      const linkExists = [...prisma._stores.userWords.values()].some(
        (uw) => uw.userId === userId && uw.wordId === res.body.data.id,
      );
      expect(linkExists).toBe(true);
    });

    it('POST /words stores an optional audioUrl and returns it', async () => {
      const audioUrl = 'https://cdn.example.com/audio/pronounce.mp3';
      const res = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${token}`)
        .send({ word: 'pronounce', translation: 'talaffuz qilmoq', audioUrl })
        .expect(201);

      expect(res.body.data.audioUrl).toBe(audioUrl);
    });

    it('POST /words rejects an invalid audioUrl', async () => {
      const res = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${token}`)
        .send({ word: 'bad', translation: 'yomon', audioUrl: 'not-a-url' })
        .expect(400);
      expect(res.body.errors.join(' ')).toMatch(/audioUrl/i);
    });

    it('PATCH /words/:id updates the audioUrl', async () => {
      const created = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${token}`)
        .send({ word: 'speak', translation: 'gapirmoq' })
        .expect(201);

      const audioUrl = 'https://cdn.example.com/audio/speak.mp3';
      const res = await request(app.getHttpServer())
        .patch(`/words/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ audioUrl })
        .expect(200);

      expect(res.body.data.audioUrl).toBe(audioUrl);
    });

    it('POST /words rejects missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${token}`)
        .send({ word: 'only-word' })
        .expect(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/translation/i)]),
      );
    });

    it('GET /words returns the paginated envelope', async () => {
      // Add a couple more words to exercise pagination
      for (const w of ['apple', 'banana', 'cherry']) {
        await request(app.getHttpServer())
          .post('/words')
          .set('Authorization', `Bearer ${token}`)
          .send({ word: w, translation: `${w}-uz` })
          .expect(201);
      }

      const res = await request(app.getHttpServer())
        .get('/words?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toMatchObject({
        page: 1,
        limit: 2,
        hasMore: true,
      });
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.total).toBeGreaterThanOrEqual(4);
    });

    it('GET /words rejects out-of-range query', async () => {
      const tooLarge = await request(app.getHttpServer())
        .get('/words?limit=999')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(tooLarge.body.errors.join(' ')).toMatch(/limit/i);
    });

    it('DELETE /words/:id removes a word the user owns', async () => {
      const created = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${token}`)
        .send({ word: 'ephemeral', translation: 'qisqa umrli' })
        .expect(201);

      const wordId = created.body.data.id;

      await request(app.getHttpServer())
        .delete(`/words/${wordId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(prisma._stores.words.has(wordId)).toBe(false);
    });

    it('DELETE /words/:id returns 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .delete('/words/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('DELETE /words/:id of another user\'s word returns 403', async () => {
      // Create a word as user A
      const a = await registerUser(app);
      const created = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${a.accessToken}`)
        .send({ word: 'private', translation: 'shaxsiy' })
        .expect(201);

      // Try to delete it as user B
      const b = await registerUser(app);
      await request(app.getHttpServer())
        .delete(`/words/${created.body.data.id}`)
        .set('Authorization', `Bearer ${b.accessToken}`)
        .expect(403);

      // Word still exists
      expect(prisma._stores.words.has(created.body.data.id)).toBe(true);
    });

    it('DELETE /words/:id rejects a non-UUID id with 400', async () => {
      await request(app.getHttpServer())
        .delete('/words/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('PATCH /words/:id edits a word the user owns', async () => {
      const created = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${token}`)
        .send({ word: 'mutable', translation: 'eski tarjima' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/words/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ translation: 'yangi tarjima' })
        .expect(200);

      expect(res.body.data).toMatchObject({
        id: created.body.data.id,
        word: 'mutable',
        translation: 'yangi tarjima',
      });
    });

    it('PATCH /words/:id returns 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .patch('/words/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ translation: 'x' })
        .expect(404);
    });

    it("PATCH /words/:id of another user's word returns 403", async () => {
      const a = await registerUser(app);
      const created = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${a.accessToken}`)
        .send({ word: 'guarded', translation: 'himoyalangan' })
        .expect(201);

      const b = await registerUser(app);
      await request(app.getHttpServer())
        .patch(`/words/${created.body.data.id}`)
        .set('Authorization', `Bearer ${b.accessToken}`)
        .send({ translation: 'hack' })
        .expect(403);

      // Original translation is untouched.
      expect(prisma._stores.words.get(created.body.data.id)?.translation).toBe(
        'himoyalangan',
      );
    });

    it('GET /words?status=NEW returns only words with that learning status', async () => {
      const u = await registerUser(app);

      const newWord = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .send({ word: 'fresh', translation: 'yangi' })
        .expect(201);

      const learnedWord = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .send({ word: 'known', translation: 'bilingan' })
        .expect(201);

      // Promote one of the user's words to LEARNED in the store.
      for (const uw of prisma._stores.userWords.values()) {
        if (uw.userId === u.userId && uw.wordId === learnedWord.body.data.id) {
          uw.status = WordStatus.LEARNED;
        }
      }

      const res = await request(app.getHttpServer())
        .get('/words?status=NEW')
        .set('Authorization', `Bearer ${u.accessToken}`)
        .expect(200);

      const ids = res.body.data.items.map((w: { id: string }) => w.id);
      expect(ids).toContain(newWord.body.data.id);
      expect(ids).not.toContain(learnedWord.body.data.id);
    });

    it('GET /words rejects an invalid status value with 400', async () => {
      await request(app.getHttpServer())
        .get('/words?status=BOGUS')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });
});
