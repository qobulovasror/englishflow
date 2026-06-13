import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WordsModule } from './modules/words/words.module';
import { LearningModule } from './modules/learning/learning.module';
import { TestsModule } from './modules/tests/tests.module';
import { ProgressModule } from './modules/progress/progress.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    // Global rate limiting. Endpoints can override per-route with @Throttle()
    // or opt out with @SkipThrottle(). Auth endpoints attach a stricter
    // policy directly in AuthController.
    //
    // The tracker keys on `req.ip`, which Express resolves from X-Forwarded-For
    // ONLY up to the configured `trust proxy` hop count (see TRUST_PROXY /
    // main.ts). We deliberately do NOT parse the raw XFF header ourselves: its
    // leftmost entry is fully client-controlled, so trusting it would let any
    // caller mint a fresh rate-limit bucket per request and bypass throttling.
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60_000, // 1 minute
          limit: 120, // 120 req/min/IP — generous for normal API traffic
        },
      ],
      getTracker: (req: Record<string, unknown>) =>
        (req as { ip?: string }).ip ?? 'unknown',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WordsModule,
    LearningModule,
    TestsModule,
    ProgressModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT auth. Routes opt out with `@Public()` (see auth controller).
    // Order matters: ThrottlerGuard runs first so unauth'd traffic is still
    // rate-limited; JwtAuthGuard then rejects anything that wasn't @Public.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
