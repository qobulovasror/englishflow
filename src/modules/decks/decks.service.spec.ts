import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CefrLevel } from '@prisma/client';
import { DecksService } from './decks.service';
import { PrismaService } from '../../prisma/prisma.service';

type MockedPrisma = {
  deck: { findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock };
  deckEnrollment: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
  userWord: { createMany: jest.Mock };
  $transaction: jest.Mock;
};

function makeDeck(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd1',
    title: 'Travel Essentials',
    description: 'Travel words',
    level: CefrLevel.A2,
    isSystem: true,
    createdAt: new Date('2026-01-01'),
    _count: { words: 3 },
    ...overrides,
  };
}

describe('DecksService', () => {
  let service: DecksService;
  let prisma: MockedPrisma;

  beforeEach(async () => {
    prisma = {
      deck: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
      deckEnrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      userWord: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn((ops: unknown[]) =>
        Promise.all(ops as Promise<unknown>[]),
      ),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DecksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(DecksService);
  });

  describe('findAll', () => {
    it('returns paginated decks with wordCount and isEnrolled flags', async () => {
      prisma.deck.findMany.mockResolvedValue([
        makeDeck({ id: 'd1' }),
        makeDeck({ id: 'd2' }),
      ]);
      prisma.deck.count.mockResolvedValue(2);
      prisma.deckEnrollment.findMany.mockResolvedValue([{ deckId: 'd1' }]);

      const result = await service.findAll('u1', { page: 1, limit: 20 } as never);

      expect(result.total).toBe(2);
      expect(result.items[0]).toMatchObject({ id: 'd1', wordCount: 3, isEnrolled: true });
      expect(result.items[1]).toMatchObject({ id: 'd2', isEnrolled: false });
    });
  });

  describe('findOne', () => {
    it('throws NotFound when the deck is not visible to the user', async () => {
      prisma.deck.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the deck with its words', async () => {
      prisma.deck.findFirst.mockResolvedValue(
        makeDeck({
          words: [
            { id: 'w1', word: 'airport', translation: 'aeroport', example: null, createdAt: new Date(), updatedAt: new Date() },
          ],
        }),
      );

      const result = await service.findOne('d1', 'u1');

      expect(result.id).toBe('d1');
      expect(result.words).toHaveLength(1);
      expect(result.words[0].word).toBe('airport');
    });
  });

  describe('enroll', () => {
    it('throws NotFound when the deck is not visible', async () => {
      prisma.deck.findFirst.mockResolvedValue(null);

      await expect(service.enroll('missing', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('bulk-adds the deck words to the learning list and records enrollment', async () => {
      prisma.deck.findFirst.mockResolvedValue(
        makeDeck({ words: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }] }),
      );

      const result = await service.enroll('d1', 'u1');

      expect(prisma.userWord.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            { userId: 'u1', wordId: 'w1' },
            { userId: 'u1', wordId: 'w2' },
            { userId: 'u1', wordId: 'w3' },
          ],
          skipDuplicates: true,
        }),
      );
      expect(prisma.deckEnrollment.upsert).toHaveBeenCalled();
      expect(result.enrolledCount).toBe(3);
      expect(result.message).toContain('Travel Essentials');
    });
  });
});
