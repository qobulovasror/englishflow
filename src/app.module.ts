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
    // `getTracker` prefers X-Forwarded-For so a single reverse proxy (e.g.
    // nginx, Cloudflare) doesn't collapse every client onto one IP. This
    // requires `app.set('trust proxy', ...)` in production — see main.ts.
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60_000, // 1 minute
          limit: 120, // 120 req/min/IP — generous for normal API traffic
        },
      ],
      getTracker: (req: Record<string, unknown>) => {
        const xff = req.headers as Record<string, string | string[]> | undefined;
        const raw = xff?.['x-forwarded-for'];
        const first = Array.isArray(raw) ? raw[0] : raw?.split(',')[0]?.trim();
        return first || ((req as { ip?: string }).ip ?? 'unknown');
      },
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
