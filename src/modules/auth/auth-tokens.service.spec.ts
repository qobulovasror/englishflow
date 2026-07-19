import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthTokenType } from '@prisma/client';
import { AuthTokensService } from './auth-tokens.service';
import { PrismaService } from '../../prisma/prisma.service';

type StoredAuthToken = {
  id: string;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  userId: string;
};

/** Minimal in-memory authToken store with interactive-$transaction support. */
function buildPrismaMock() {
  const rows = new Map<string, StoredAuthToken>(); // keyed by tokenHash
  let counter = 0;

  const authToken = {
    create: jest.fn(async ({ data }: any) => {
      counter += 1;
      const row: StoredAuthToken = {
        id: `at${counter}`,
        type: data.type,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        usedAt: null,
        userId: data.userId,
      };
      rows.set(row.tokenHash, row);
      return row;
    }),
    findUnique: jest.fn(
      async ({ where }: any) => rows.get(where.tokenHash) ?? null,
    ),
    // Mirrors the atomic conditional write in consume(): only stamps a row that
    // is the right type, still unused, and unexpired; returns the affected count.
    updateMany: jest.fn(async ({ where, data }: any) => {
      const now = where.expiresAt?.gt ?? new Date();
      let count = 0;
      for (const row of rows.values()) {
        if (
          row.tokenHash === where.tokenHash &&
          row.type === where.type &&
          row.usedAt === null &&
          row.expiresAt > now
        ) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return { count };
    }),
  };

  const prisma = {
    authToken,
    $transaction: jest.fn(async (input: any) =>
      typeof input === 'function' ? input(prisma) : Promise.all(input),
    ),
    _rows: rows,
  };
  return prisma;
}

describe('AuthTokensService', () => {
  let service: AuthTokensService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthTokensService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AuthTokensService);
  });

  describe('issue', () => {
    it('returns a plaintext token and persists only its hash', async () => {
      const { token, expiresAt } = await service.issue(
        'u1',
        AuthTokenType.PASSWORD_RESET,
        60_000,
      );

      expect(token).toEqual(expect.any(String));
      expect(token.length).toBeGreaterThan(20);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      const createArg = prisma.authToken.create.mock.calls[0][0];
      expect(createArg.data.tokenHash).not.toBe(token); // hashed, not plaintext
      expect(createArg.data.type).toBe(AuthTokenType.PASSWORD_RESET);
      expect(createArg.data.userId).toBe('u1');
    });
  });

  describe('consume', () => {
    it('returns the userId and marks the token used (happy path)', async () => {
      const { token } = await service.issue(
        'u1',
        AuthTokenType.PASSWORD_RESET,
        60_000,
      );

      const userId = await service.consume(token, AuthTokenType.PASSWORD_RESET);
      expect(userId).toBe('u1');

      const stored = [...prisma._rows.values()][0];
      expect(stored.usedAt).toBeInstanceOf(Date);
    });

    it('rejects an unknown token with BadRequest', async () => {
      await expect(
        service.consume('does-not-exist', AuthTokenType.PASSWORD_RESET),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a token of the wrong type', async () => {
      const { token } = await service.issue(
        'u1',
        AuthTokenType.EMAIL_VERIFY,
        60_000,
      );

      await expect(
        service.consume(token, AuthTokenType.PASSWORD_RESET),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects reuse of an already-consumed token', async () => {
      const { token } = await service.issue(
        'u1',
        AuthTokenType.PASSWORD_RESET,
        60_000,
      );

      await service.consume(token, AuthTokenType.PASSWORD_RESET);

      await expect(
        service.consume(token, AuthTokenType.PASSWORD_RESET),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expired token', async () => {
      const { token } = await service.issue(
        'u1',
        AuthTokenType.PASSWORD_RESET,
        -1_000, // already expired
      );

      await expect(
        service.consume(token, AuthTokenType.PASSWORD_RESET),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
