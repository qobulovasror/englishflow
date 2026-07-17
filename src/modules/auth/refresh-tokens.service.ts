import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtConfig } from '../../config/configuration';

/** Result of issuing a new refresh token. */
export interface IssuedRefreshToken {
  /** Plaintext token to return to the client. NEVER persisted. */
  token: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokensService {
  // 32 bytes = 256 bits of entropy. Encoded with base64url so it's URL-safe
  // and roughly 43 chars long.
  private static readonly TOKEN_BYTES = 32;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates a new opaque refresh token, persists its hash, and returns the
   * plaintext for the caller to hand to the client. The plaintext only ever
   * exists in this return value and in the client's storage.
   */
  async issue(userId: string): Promise<IssuedRefreshToken> {
    const token = this.generateOpaqueToken();
    const expiresAt = this.computeExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(token),
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Verifies a refresh token, soft-revokes it, and issues a fresh one in the
   * same transaction. Returns the new token along with the user id so the
   * caller can mint a new access token.
   *
   * Rotation means a stolen token is single-use: as soon as the legitimate
   * user (or attacker) uses it, the other party's copy is invalidated.
   *
   * We keep the rotated row (stamping `revokedAt`) instead of deleting it so a
   * later replay is recognisable as *reuse* rather than a generic "unknown
   * token". Replaying a revoked token triggers automatic reuse detection below,
   * which kills the whole chain (OWASP refresh-token rotation pattern). The
   * nightly CleanupService purges revoked/expired rows so they don't accumulate.
   */
  async rotate(
    token: string,
  ): Promise<{ userId: string; issued: IssuedRefreshToken }> {
    const tokenHash = this.hash(token);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (existing.revokedAt) {
      // A previously-rotated (revoked) token is being replayed. Either the
      // legitimate user's token was stolen and used, or the attacker's copy is
      // being reused — we can't tell which, so kill the entire chain.
      await this.revokeAllForUser(existing.userId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (existing.expiresAt <= new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: existing.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Soft-revoke the old token + issue a new one atomically. The revoke is a
    // CONDITIONAL claim (`revokedAt: null`): if two requests present the same
    // token concurrently, only one updateMany matches (count 1); the loser sees
    // count 0 and is treated as reuse — kills the chain. Without this atomic
    // guard both would pass the read-time `revokedAt` check above and both mint
    // a valid token, defeating single-use.
    const newTokenPlaintext = this.generateOpaqueToken();
    const newExpiresAt = this.computeExpiry();

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (claimed.count === 0) {
        // Someone already rotated this exact token → reuse.
        await tx.refreshToken.deleteMany({
          where: { userId: existing.userId },
        });
        throw new UnauthorizedException('Refresh token reuse detected');
      }
      await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: this.hash(newTokenPlaintext),
          expiresAt: newExpiresAt,
        },
      });
    });

    return {
      userId: existing.userId,
      issued: { token: newTokenPlaintext, expiresAt: newExpiresAt },
    };
  }

  /** Hard-deletes the token if it exists. Idempotent. */
  async revoke(token: string): Promise<void> {
    await this.prisma.refreshToken
      .delete({ where: { tokenHash: this.hash(token) } })
      .catch(() => undefined);
  }

  /** Hard-deletes every refresh token for a user (logout-everywhere). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private generateOpaqueToken(): string {
    return randomBytes(RefreshTokensService.TOKEN_BYTES).toString('base64url');
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private computeExpiry(): Date {
    const days =
      this.configService.getOrThrow<JwtConfig>('jwt').refreshExpiresInDays;
    const ms = days * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ms);
  }
}
