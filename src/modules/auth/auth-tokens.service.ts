import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthTokenType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Result of issuing a new one-time auth token. */
export interface IssuedAuthToken {
  /** Plaintext token to email to the user. NEVER persisted. */
  token: string;
  expiresAt: Date;
}

/**
 * Issues and consumes single-use, email-delivered tokens (password reset and
 * email verification). Mirrors RefreshTokensService: only the SHA-256 hash is
 * stored, so a database leak never exposes a usable token.
 */
@Injectable()
export class AuthTokensService {
  // 32 bytes = 256 bits of entropy, base64url-encoded (~43 URL-safe chars).
  private static readonly TOKEN_BYTES = 32;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates an opaque token of the given type, persists its hash with a TTL,
   * and returns the plaintext for the caller to email out.
   */
  async issue(
    userId: string,
    type: AuthTokenType,
    ttlMs: number,
  ): Promise<IssuedAuthToken> {
    const token = this.generateOpaqueToken();
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.authToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hash(token),
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Verifies a token of the expected type and marks it consumed in one
   * transaction, returning the owning user id. A missing, wrong-type, already
   * used, or expired token is rejected as a 400 — the same opaque error for
   * every failure mode, so a caller can't probe token validity.
   */
  async consume(token: string, type: AuthTokenType): Promise<string> {
    const tokenHash = this.hash(token);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.authToken.findUnique({ where: { tokenHash } });

      if (
        !existing ||
        existing.type !== type ||
        existing.usedAt !== null ||
        existing.expiresAt <= new Date()
      ) {
        throw new BadRequestException('Invalid or expired token');
      }

      await tx.authToken.update({
        where: { id: existing.id },
        data: { usedAt: new Date() },
      });

      return existing.userId;
    });
  }

  private generateOpaqueToken(): string {
    return randomBytes(AuthTokensService.TOKEN_BYTES).toString('base64url');
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
