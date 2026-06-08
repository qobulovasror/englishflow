process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'x'.repeat(48);
process.env.DATABASE_URL ??=
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.CORS_ORIGIN ??= 'http://localhost';

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerUser } from './helpers/test-app';

async function seedWords(
  app: INestApplication,
  token: string,
  pairs: Array<{ word: string; translation: string }>,
) {
  const ids: string[] = [];
  for (const p of pairs) {
    const res = await request(app.getHttpServer())
      .post('/words')
      .set('Authorization', `Bearer ${token}`)
      .send(p)
      .expect(201);
    ids.push(res.body.data.id);
  }
  return ids;
}

describe('Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /tests/start', () => {
    it('requires auth (401 without Bearer)', async () => {
      await request(app.getHttpServer()).post('/tests/start').expect(401);
    });

    it('returns 400 when the user has fewer than 5 words', async () => {
      const { accessToken } = await registerUser(app);
      await seedWords(app, accessToken, [
        { word: 'one', translation: 'bir' },
        { word: 'two', translation: 'ikki' },
      ]);

      const res = await request(app.getHttpServer())
        .post('/tests/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
      expect(res.body.message).toMatch(/at least 5 words/i);
    });

    it('returns a quiz of 5 questions with 4 options each', async () => {
      const { accessToken } = await registerUser(app);
      await seedWords(app, accessToken, [
        { word: 'one', translation: 'bir' },
        { word: 'two', translation: 'ikki' },
        { word: 'three', translation: 'uch' },
        { word: 'four', translation: 'to’rt' },
        { word: 'five', translation: 'besh' },
        { word: 'six', translation: 'olti' },
        { word: 'seven', translation: 'yetti' },
      ]);

      const res = await request(app.getHttpServer())
        .post('/tests/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.questions).toHaveLength(5);
      for (const q of res.body.data.questions) {
        expect(q.options).toHaveLength(4);
        expect(q.word).toEqual(expect.any(String));
      }
    });

    it('never leaks the correct answer to the client', async () => {
      const { accessToken } = await registerUser(app);
      await seedWords(app, accessToken, [
        { word: 'one', translation: 'bir' },
        { word: 'two', translation: 'ikki' },
        { word: 'three', translation: 'uch' },
        { word: 'four', translation: 'to’rt' },
        { word: 'five', translation: 'besh' },
      ]);

      const res = await request(app.getHttpServer())
        .post('/tests/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      for (const q of res.body.data.questions) {
        expect(q).not.toHaveProperty('correctAnswer');
      }
    });
  });

  describe('POST /tests/submit', () => {
    let token: string;
    let wordIds: string[];

    beforeAll(async () => {
      const u = await registerUser(app);
      token = u.accessToken;
      wordIds = await seedWords(app, token, [
        { word: 'one', translation: 'bir' },
        { word: 'two', translation: 'ikki' },
        { word: 'three', translation: 'uch' },
      ]);
    });

    it('grades correct answers and stores the test', async () => {
      const res = await request(app.getHttpServer())
        .post('/tests/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: [
            { wordId: wordIds[0], selectedAnswer: 'bir' }, // correct
            { wordId: wordIds[1], selectedAnswer: 'ikki' }, // correct
            { wordId: wordIds[2], selectedAnswer: 'WRONG' }, // wrong
          ],
        })
        .expect(200);

      expect(res.body.data).toMatchObject({
        score: 2,
        total: 3,
        percentage: 67,
      });
      expect(res.body.data.testId).toEqual(expect.any(String));
      expect(res.body.data.questions).toHaveLength(3);
    });

    it('rejects an empty answers array with 400', async () => {
      await request(app.getHttpServer())
        .post('/tests/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: [] })
        .expect(400);
    });

    it('rejects malformed answers (missing required fields)', async () => {
      const res = await request(app.getHttpServer())
        .post('/tests/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: [{ wordId: wordIds[0] }] })
        .expect(400);
      expect(res.body.errors.join(' ')).toMatch(/selectedAnswer/);
    });
  });
});
