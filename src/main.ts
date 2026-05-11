import { NestFactory, HttpAdapterHost, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');

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
    new LoggingInterceptor(),
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
          description: 'Paste a JWT obtained from /auth/login or /auth/register',
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
  logger.log(`Application running on port ${appConfig.port} [${appConfig.nodeEnv}]`);
}

bootstrap();
