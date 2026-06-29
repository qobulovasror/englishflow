import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';

function buildPrismaMock() {
  return {
    refreshToken: {
      deleteMany: jest.fn(async () => ({ count: 3 })),
    },
    authToken: {
      deleteMany: jest.fn(async () => ({ count: 5 })),
    },
  };
}

describe('CleanupService', () => {
  let service: CleanupService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(CleanupService);
  });

  describe('purgeExpiredTokens', () => {
    it('deletes expired refresh tokens (expiresAt < now)', async () => {
      await service.purgeExpiredTokens();

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
      const where = prisma.refreshToken.deleteMany.mock.calls[0][0].where;
      expect(where).toEqual({ expiresAt: { lt: expect.any(Date) } });
    });

    it('deletes auth tokens that are expired OR already used', async () => {
      await service.purgeExpiredTokens();

      expect(prisma.authToken.deleteMany).toHaveBeenCalledTimes(1);
      const where = prisma.authToken.deleteMany.mock.calls[0][0].where;
      expect(where).toEqual({
        OR: [{ expiresAt: { lt: expect.any(Date) } }, { usedAt: { not: null } }],
      });
    });

    it('returns the deleted counts from both tables', async () => {
      const result = await service.purgeExpiredTokens();

      expect(result).toEqual({ refreshTokens: 3, authTokens: 5 });
    });

    it('uses a single "now" cutoff that is not in the future', async () => {
      const before = Date.now();
      await service.purgeExpiredTokens();
      const after = Date.now();

      const refreshCutoff: Date =
        prisma.refreshToken.deleteMany.mock.calls[0][0].where.expiresAt.lt;
      const authCutoff: Date =
        prisma.authToken.deleteMany.mock.calls[0][0].where.OR[0].expiresAt.lt;

      expect(refreshCutoff.getTime()).toBe(authCutoff.getTime());
      expect(refreshCutoff.getTime()).toBeGreaterThanOrEqual(before);
      expect(refreshCutoff.getTime()).toBeLessThanOrEqual(after);
    });
  });
});
