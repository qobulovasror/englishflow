/**
 * Exports the OpenAPI 3.0 spec for the API to `openapi.json` at the repo root.
 *
 * The frontend (and any future client) generates strongly-typed bindings from
 * this file via `openapi-typescript`. Run after backend API changes:
 *
 *   npm run openapi   (this script)
 *   cd frontend && npm run generate:types
 *
 * The script does NOT need a running database — Prisma's onModuleInit is
 * stubbed and the env validation is satisfied with dummy values.
 */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Satisfy env validation without touching a real .env
process.env.NODE_ENV ??= 'development';
process.env.JWT_SECRET ??= 'x'.repeat(48);
process.env.DATABASE_URL ??=
  'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function exportOpenApi(): Promise<void> {
  // Skip Prisma's DB connection — we only need module metadata.
  PrismaService.prototype.onModuleInit = async () => undefined;
  PrismaService.prototype.onModuleDestroy = async () => undefined;

  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('EnglishFlow API')
    .setDescription(
      'REST API for the EnglishFlow vocabulary learning app. ' +
        'All successful responses are wrapped in `{ success, data, timestamp }` ' +
        'and all errors in `{ success: false, statusCode, message, error, errors?, path, timestamp }`.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const target = resolve(__dirname, '..', 'openapi.json');
  writeFileSync(target, JSON.stringify(document, null, 2));

  console.log(`✓ OpenAPI spec written to ${target}`);
  console.log(`  Endpoints: ${Object.keys(document.paths).length}`);
  console.log(`  Schemas:   ${Object.keys(document.components?.schemas ?? {}).length}`);

  await app.close();
}

exportOpenApi().catch((err) => {
  console.error('Failed to export OpenAPI:', err);
  process.exit(1);
});
