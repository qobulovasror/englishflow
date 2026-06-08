/**
 * E2E test for rate limiting. Verifies that bursts on /auth/login exceed
 * the 10/min limit and return 429 with the standard error envelope.
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
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: async () => undefined,
        onModuleDestroy: async () => undefined,
        user: {
          // Always return null so /auth/login throws 401 — we don't care about
          // the actual auth outcome, only the throttler's pre-handler behavior.
          findUnique: jest.fn().mockResolvedValue(null),
        },
      })
      .compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
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

  // Bumped: each /auth/login now runs bcrypt.compare against a dummy hash
  // (cost factor 12) so the missing-user branch isn't a timing oracle.
  // That makes 11 sequential calls easily exceed Jest's 5s default.
  it('returns 429 with the standard envelope after 10 /auth/login attempts', async () => {
    const server = app.getHttpServer();
    const payload = { email: 'noone@example.com', password: 'pw' };

    // Fire 10 sequential requests under the limit — all should be 401 (auth
    // fails), not 429 (limit not yet reached).
    for (let i = 0; i < 10; i++) {
      const res = await request(server).post('/auth/login').send(payload);
      expect(res.status).toBe(401);
    }

    // 11th request — exceeds the throttler window
    const blocked = await request(server).post('/auth/login').send(payload);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({
      success: false,
      statusCode: 429,
      path: '/auth/login',
      timestamp: expect.any(String),
    });
  }, 20_000);
});
