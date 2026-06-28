process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'x'.repeat(48);
process.env.DATABASE_URL ??=
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.CORS_ORIGIN ??= 'http://localhost';

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerUser } from './helpers/test-app';
import type { PrismaStub } from './helpers/prisma-stub';
import { WordStatus } from '@prisma/client';

describe('Progress (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaStub;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /progress requires auth', async () => {
    await request(app.getHttpServer()).get('/progress').expect(401);
  });

  it('returns all-zeros for a brand new user', async () => {
    const { accessToken } = await registerUser(app);

    const res = await request(app.getHttpServer())
      .get('/progress')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toMatchObject({
      vocabulary: {
        total: 0,
        new: 0,
        learning: 0,
        learned: 0,
        progressPercentage: 0,
      },
      tests: {
        total: 0,
        averageScore: 0,
        recent: [],
      },
      streak: {
        current: 0,
        longest: 0,
        todayCount: 0,
        dailyGoal: 20,
        goalMet: false,
      },
    });
  });

  it('reflects reviews in the streak section and respects dailyGoal', async () => {
    const { accessToken, userId } = await registerUser(app);

    // Lower the goal so a couple of reviews meet it.
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dailyGoal: 2 })
      .expect(200);

    // Seed 2 reviews dated today directly via the stub store.
    const now = new Date();
    prisma._stores.reviews.set('rev-1', {
      id: 'rev-1',
      userId,
      wordId: 'w-x',
      rating: 'GOOD',
      createdAt: now,
    });
    prisma._stores.reviews.set('rev-2', {
      id: 'rev-2',
      userId,
      wordId: 'w-y',
      rating: 'EASY',
      createdAt: now,
    });

    const res = await request(app.getHttpServer())
      .get('/progress')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.streak).toMatchObject({
      current: 1,
      longest: 1,
      todayCount: 2,
      dailyGoal: 2,
      goalMet: true,
    });
  });

  it('PATCH /users/me updates dailyGoal without the current password', async () => {
    const { accessToken } = await registerUser(app);

    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dailyGoal: 50 })
      .expect(200);

    expect(res.body.data.dailyGoal).toBe(50);
  });

  it('aggregates vocabulary counts and test stats', async () => {
    const { accessToken, userId } = await registerUser(app);

    // Seed 3 words via the API
    const wordIds: string[] = [];
    for (const w of ['a', 'b', 'c']) {
      const res = await request(app.getHttpServer())
        .post('/words')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ word: w, translation: `${w}-uz` })
        .expect(201);
      wordIds.push(res.body.data.id);
    }

    // Promote 1 to LEARNING, 1 to LEARNED directly via the stub
    const uwArr = [...prisma._stores.userWords.values()].filter(
      (uw) => uw.userId === userId,
    );
    uwArr[0].status = WordStatus.LEARNING;
    uwArr[1].status = WordStatus.LEARNED;

    // Record 2 tests directly via the stub
    prisma._stores.tests.set('t-1', {
      id: 't-1',
      userId,
      score: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma._stores.tests.set('t-2', {
      id: 't-2',
      userId,
      score: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .get('/progress')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.vocabulary).toMatchObject({
      total: 3,
      new: 1,
      learning: 1,
      learned: 1,
      progressPercentage: 33, // 1 of 3 learned = 33%
    });
    expect(res.body.data.tests).toMatchObject({
      total: 2,
      averageScore: 4, // (3 + 5) / 2
    });
    expect(res.body.data.tests.recent).toHaveLength(2);
  });

  it('is scoped to the calling user (does not include other users\' data)', async () => {
    const alice = await registerUser(app);
    const bob = await registerUser(app);

    // Alice adds 1 word
    await request(app.getHttpServer())
      .post('/words')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ word: 'apple', translation: 'olma' })
      .expect(201);

    // Bob should still see 0
    const res = await request(app.getHttpServer())
      .get('/progress')
      .set('Authorization', `Bearer ${bob.accessToken}`)
      .expect(200);

    expect(res.body.data.vocabulary.total).toBe(0);
  });
});
