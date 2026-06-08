process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'x'.repeat(48);
process.env.DATABASE_URL ??=
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.CORS_ORIGIN ??= 'http://localhost';

import { INestApplication } from '@nestjs/common';
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
  });
});
