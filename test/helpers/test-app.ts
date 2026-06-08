import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { buildPrismaStub, type PrismaStub } from './prisma-stub';

/** Boots a full Nest app with a fresh in-memory Prisma. */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaStub;
}> {
  const prisma = buildPrismaStub();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });

  // Match src/main.ts so `req.cookies.refresh_token` is populated.
  app.use(cookieParser());

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
  return { app, prisma };
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

export async function registerUser(
  app: INestApplication,
  email = `user-${Math.random().toString(36).slice(2, 10)}@example.com`,
  password = 'StrongPass!123',
): Promise<{ accessToken: string; refreshToken: string; userId: string; email: string }> {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password });
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
    userId: res.body.data.user.id,
    email,
  };
}
