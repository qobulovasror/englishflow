import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/** Number of token rows purged in a single cleanup run. */
export interface PurgeResult {
  refreshTokens: number;
  authTokens: number;
}

/**
 * Periodic housekeeping for the token tables. Expired refresh tokens and
 * spent/expired one-time auth tokens are dead weight: they can never be used
 * again (the auth services reject them), they only exist as audit residue, and
 * they grow unbounded as users log in and request resets. This sweeps them.
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deletes stale token rows:
   *  - refresh tokens whose `expiresAt` is in the past, and
   *  - auth tokens that are expired (`expiresAt < now`) OR already consumed
   *    (`usedAt` is set).
   *
   * Runs nightly via @Cron, but is also callable directly (and is in tests).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredTokens(): Promise<PurgeResult> {
    const now = new Date();

    const [refreshTokens, authTokens] = await Promise.all([
      this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.authToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
        },
      }),
    ]);

    const result: PurgeResult = {
      refreshTokens: refreshTokens.count,
      authTokens: authTokens.count,
    };

    this.logger.log(
      `Purged ${result.refreshTokens} expired refresh token(s) and ` +
        `${result.authTokens} expired/used auth token(s).`,
    );

    return result;
  }
}
