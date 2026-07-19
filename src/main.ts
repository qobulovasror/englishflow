import { NestFactory, HttpAdapterHost, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { initSentry } from './common/sentry/sentry';

async function bootstrap() {
  // Init before anything else so early errors are captured. No-op without a DSN.
  initSentry(process.env.SENTRY_DSN, process.env.NODE_ENV ?? 'development');

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Route all framework + application logs through pino (buffered logs above
  // flush here). Must run before the first real log line.
  app.useLogger(app.get(PinoLogger));

  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');

  // Trust exactly `trustProxy` reverse-proxy hops so Express resolves `req.ip`
  // from the right of the X-Forwarded-For chain. Without this, the rate-limiter's
  // tracker would read a client-forgeable XFF header and every spoofed value
  // would mint a fresh bucket — defeating the throttler entirely. 0 = no proxy
  // (XFF ignored); behind one nginx/Cloudflare set TRUST_PROXY=1.
  app.set('trust proxy', appConfig.trustProxy);

  // Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, etc.).
  // The API serves JSON only, so the default CSP is unnecessary and would only
  // affect the Swagger UI in dev — disable it to keep /docs working.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Required so `@Req() req.cookies.refresh_token` is populated for the
  // web client. Mobile sends the token via JSON body and ignores cookies.
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
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalFilters(
    new AllExceptionsFilter(app.get(HttpAdapterHost), configService),
  );

  app.enableCors({
    origin: appConfig.corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  });

  if (appConfig.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
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
          description:
            'Paste a JWT obtained from /auth/login or /auth/register',
        },
        'JWT',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    logger.log(`Swagger docs: http://localhost:${appConfig.port}/docs`);
  }

  await app.listen(appConfig.port);
  logger.log(
    `Application running on port ${appConfig.port} [${appConfig.nodeEnv}]`,
  );
}

bootstrap();
