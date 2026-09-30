process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'x'.repeat(48);
process.env.DATABASE_URL ??=
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';
process.env.CORS_ORIGIN ??= 'http://localhost';

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerUser } from './helpers/test-app';
import type { PrismaStub } from './helpers/prisma-stub';

describe('Learning daily plan (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaStub;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('enforces the daily new-word cap and restores unfinished cards', async () => {
    const { accessToken, userId } = await registerUser(app);
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dailyNewLimit: 3 })
      .expect(200);

    for (let index = 0; index < 6; index++) {
      const word = await prisma.word.create({
        data: {
          word: `daily-${userId}-${index}`,
          translation: `tarjima-${index}`,
          createdById: userId,
        },
      });
      await prisma.userWord.create({ data: { userId, wordId: word.id } });
    }

    const first = await request(app.getHttpServer())
      .get('/learning/daily?tzOffsetMinutes=300')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const resumed = await request(app.getHttpServer())
      .get('/learning/daily?tzOffsetMinutes=300')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(first.body.data).toHaveLength(3);
    expect(resumed.body.data.map((card: { id: string }) => card.id)).toEqual(
      first.body.data.map((card: { id: string }) => card.id),
    );

    for (const card of first.body.data) {
      await request(app.getHttpServer())
        .post('/learning/review')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userWordId: card.id, rating: 'GOOD' })
        .expect(200);
    }

    const afterCompletion = await request(app.getHttpServer())
      .get('/learning/daily?tzOffsetMinutes=300')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(afterCompletion.body.data).toHaveLength(0);
  });
});
