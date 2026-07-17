import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokensService } from './refresh-tokens.service';
import { PrismaService } from '../../prisma/prisma.service';

type StoredRefreshToken = {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userId: string;
};

/** Minimal in-memory refreshToken store with $transaction([]) support. */
function buildPrismaMock() {
  const rows = new Map<string, StoredRefreshToken>(); // keyed by tokenHash
  let counter = 0;

  const refreshToken = {
    create: jest.fn(async ({ data }: any) => {
      counter += 1;
      const row: StoredRefreshToken = {
        id: `rt${counter}`,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        revokedAt: data.revokedAt ?? null,
        userId: data.userId,
      };
      rows.set(row.tokenHash, row);
      return row;
    }),
    findUnique: jest.fn(
      async ({ where }: any) => rows.get(where.tokenHash) ?? null,
    ),
    update: jest.fn(async ({ where, data }: any) => {
      for (const row of rows.values()) {
        if (row.id === where.id || row.tokenHash === where.tokenHash) {
          Object.assign(row, data);
          return row;
        }
      }
      throw new Error('not found');
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const row of rows.values()) {
        const matchId = !where.id || row.id === where.id;
        const matchRevoked =
          where.revokedAt === null ? row.revokedAt === null : true;
        if (matchId && matchRevoked) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return { count };
    }),
    delete: jest.fn(async ({ where }: any) => {
      for (const [hash, row] of rows) {
        if (row.id === where.id || row.tokenHash === where.tokenHash) {
          rows.delete(hash);
          return row;
        }
      }
      throw new Error('not found');
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      let count = 0;
      for (const [hash, row] of rows) {
        if (row.userId === where.userId) {
          rows.delete(hash);
          count += 1;
        }
      }
      return { count };
    }),
  };

  const prisma = {
    refreshToken,
    $transaction: jest.fn(async (input: any) =>
      typeof input === 'function' ? input(prisma) : Promise.all(input),
    ),
    _rows: rows,
  };
  return prisma;
}

describe('RefreshTokensService', () => {
  let service: RefreshTokensService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue({ refreshExpiresInDays: 7 }),
          },
        },
      ],
    }).compile();
    service = module.get(RefreshTokensService);
  });

  describe('issue', () => {
    it('returns a plaintext token and persists only its hash', async () => {
      const { token, expiresAt } = await service.issue('u1');

      expect(token).toEqual(expect.any(String));
      expect(token.length).toBeGreaterThan(20);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      const stored = [...prisma._rows.values()][0];
      expect(stored.tokenHash).not.toBe(token); // hashed, not plaintext
      expect(stored.userId).toBe('u1');
    });
  });

  describe('rotate', () => {
    it('soft-revokes the old token and returns a new one + the user id', async () => {
      const { token } = await service.issue('u1');
      const oldHash = [...prisma._rows.values()][0].tokenHash;

      const { userId, issued } = await service.rotate(token);

      expect(userId).toBe('u1');
      expect(issued.token).not.toBe(token);
      // Old row kept (soft-revoked) + new row = two rows.
      expect(prisma._rows.size).toBe(2);
      const oldRow = prisma._rows.get(oldHash);
      expect(oldRow?.revokedAt).toBeInstanceOf(Date);
      const liveRows = [...prisma._rows.values()].filter((r) => !r.revokedAt);
      expect(liveRows).toHaveLength(1);
      expect(liveRows[0].userId).toBe('u1');
    });

    it('detects reuse when the rotated (revoked) token is replayed', async () => {
      const { token } = await service.issue('u1');
      await service.rotate(token); // token is now soft-revoked

      await expect(service.rotate(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      // Reuse detection wiped the whole chain.
      expect(prisma._rows.size).toBe(0);
    });

    it('rejects an unknown token', async () => {
      await expect(service.rotate('nope')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an expired token and deletes it', async () => {
      const { token } = await service.issue('u1');
      // Force the stored row to be expired.
      [...prisma._rows.values()][0].expiresAt = new Date(Date.now() - 1000);

      await expect(service.rotate(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma._rows.size).toBe(0);
    });

    it('treats a revoked token as reuse and wipes the user chain', async () => {
      const { token } = await service.issue('u1');
      await service.issue('u1'); // a second live token for the same user
      [...prisma._rows.values()][0].revokedAt = new Date();

      await expect(service.rotate(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      // revokeAllForUser nuked every row for u1.
      expect(prisma._rows.size).toBe(0);
    });
  });

  describe('revoke', () => {
    it('hard-deletes the matching token', async () => {
      const { token } = await service.issue('u1');
      await service.revoke(token);
      expect(prisma._rows.size).toBe(0);
    });

    it('is idempotent for a missing token', async () => {
      await expect(service.revoke('missing')).resolves.toBeUndefined();
    });
  });

  describe('revokeAllForUser', () => {
    it('deletes every token owned by the user', async () => {
      await service.issue('u1');
      await service.issue('u1');
      await service.issue('u2');

      await service.revokeAllForUser('u1');

      const remaining = [...prisma._rows.values()];
      expect(remaining).toHaveLength(1);
      expect(remaining[0].userId).toBe('u2');
    });
  });
});
