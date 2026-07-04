import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';

type MockedPrisma = {
  user: {
    count: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  deck: { count: jest.Mock; findUnique: jest.Mock };
  word: {
    count: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  review: { count: jest.Mock };
  test: { count: jest.Mock };
  $transaction: jest.Mock;
};

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'user@example.com',
    role: Role.USER,
    level: null,
    dailyGoal: 20,
    onboardedAt: null,
    emailVerifiedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    _count: { words: 0, decks: 0, enrollments: 0, reviews: 0, tests: 0 },
    ...overrides,
  };
}

describe('AdminService', () => {
  let service: AdminService;
  let prisma: MockedPrisma;

  beforeEach(() => {
    prisma = {
      user: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      deck: { count: jest.fn(), findUnique: jest.fn() },
      word: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      review: { count: jest.fn() },
      test: { count: jest.fn() },
      $transaction: jest.fn((input: unknown) =>
        typeof input === 'function'
          ? (input as (tx: unknown) => unknown)(prisma)
          : Promise.all(input as Promise<unknown>[]),
      ),
    };
    service = new AdminService(prisma as unknown as PrismaService);
  });

  describe('overview', () => {
    it('aggregates counts into the overview shape', async () => {
      // Per-model queues, decoupled from the cross-model evaluation order:
      // user.count ×6, deck.count ×2, word.count ×1, review.count ×2, test ×1.
      prisma.user.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(3) // admins
        .mockResolvedValueOnce(80) // verified
        .mockResolvedValueOnce(90) // onboarded
        .mockResolvedValueOnce(5) // newToday
        .mockResolvedValueOnce(20); // newThisWeek
      prisma.deck.count
        .mockResolvedValueOnce(40) // total
        .mockResolvedValueOnce(12); // system
      prisma.word.count.mockResolvedValueOnce(800);
      prisma.review.count
        .mockResolvedValueOnce(9000) // total
        .mockResolvedValueOnce(30); // today
      prisma.test.count.mockResolvedValueOnce(200);

      const result = await service.overview();

      expect(result.users).toEqual({
        total: 100,
        admins: 3,
        verified: 80,
        onboarded: 90,
        newToday: 5,
        newThisWeek: 20,
      });
      expect(result.decks).toEqual({ total: 40, system: 12 });
      expect(result.words).toEqual({ total: 800 });
      expect(result.reviews).toEqual({ total: 9000, today: 30 });
      expect(result.tests).toEqual({ total: 200 });
    });
  });

  describe('changeRole', () => {
    it('rejects changing your own role', async () => {
      await expect(
        service.changeRole('u1', Role.USER, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects demoting the last remaining admin', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ role: Role.ADMIN }));
      prisma.user.count.mockResolvedValue(1);
      await expect(
        service.changeRole('u2', Role.USER, 'admin'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates the role otherwise', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.user.update.mockResolvedValue(makeUser({ role: Role.ADMIN }));
      const dto = await service.changeRole('u1', Role.ADMIN, 'admin');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: Role.ADMIN } }),
      );
      expect(dto.role).toBe(Role.ADMIN);
    });

    it('throws NotFound for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.changeRole('missing', Role.ADMIN, 'admin'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('rejects deleting yourself', async () => {
      await expect(service.deleteUser('u1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects deleting the last remaining admin', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ role: Role.ADMIN }));
      prisma.user.count.mockResolvedValue(1);
      await expect(service.deleteUser('u2', 'admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('deletes a regular user', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      const res = await service.deleteUser('u2', 'admin');
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u2' } });
      expect(res.message).toBe('User deleted');
    });
  });

  describe('verifyUserEmail', () => {
    it('keeps an existing verification timestamp (idempotent)', async () => {
      const verifiedAt = new Date('2026-02-02');
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ emailVerifiedAt: verifiedAt }),
      );
      prisma.user.update.mockResolvedValue(
        makeUser({ emailVerifiedAt: verifiedAt }),
      );
      await service.verifyUserEmail('u1');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { emailVerifiedAt: verifiedAt } }),
      );
    });
  });

  describe('createWord', () => {
    it('throws when the target deck does not exist', async () => {
      prisma.deck.findUnique.mockResolvedValue(null);
      await expect(
        service.createWord({
          word: 'a',
          translation: 'b',
          deckId: 'd-missing',
        } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates an ownerless word', async () => {
      prisma.word.create.mockResolvedValue({
        id: 'w1',
        word: 'a',
        translation: 'b',
        example: null,
        audioUrl: null,
        deckId: null,
        createdById: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deck: null,
        createdBy: null,
      });
      const dto = await service.createWord({
        word: 'a',
        translation: 'b',
      } as never);
      expect(prisma.word.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdById: null }),
        }),
      );
      expect(dto.isSystem).toBe(true);
    });
  });

  describe('updateWord / deleteWord', () => {
    it('updateWord throws NotFound for an unknown word', async () => {
      prisma.word.findUnique.mockResolvedValue(null);
      await expect(
        service.updateWord('missing', { word: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deleteWord throws NotFound for an unknown word', async () => {
      prisma.word.findUnique.mockResolvedValue(null);
      await expect(service.deleteWord('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
