import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CefrLevel } from '@prisma/client';
import { DecksService } from './decks.service';
import { PrismaService } from '../../prisma/prisma.service';

type MockedPrisma = {
  deck: {
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  deckEnrollment: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
  word: { count: jest.Mock; createMany: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
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
      deck: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      deckEnrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      word: {
        count: jest.fn().mockResolvedValue(0),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      userWord: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn((input: unknown) =>
        typeof input === 'function'
          ? (input as (tx: unknown) => unknown)(prisma)
          : Promise.all(input as Promise<unknown>[]),
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

  describe('create', () => {
    it('creates a user deck with isSystem=false and empty wordCount', async () => {
      prisma.deck.create.mockResolvedValue(
        makeDeck({ id: 'd9', isSystem: false, createdById: 'u1' }),
      );

      const result = await service.create(
        { title: 'My Deck', isPublic: true } as never,
        'u1',
      );

      expect(prisma.deck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdById: 'u1',
            isSystem: false,
            isPublic: true,
          }),
        }),
      );
      expect(result).toMatchObject({ id: 'd9', wordCount: 0, isEnrolled: false });
    });
  });

  describe('update', () => {
    it('updates only provided fields on an owned deck', async () => {
      prisma.deck.findUnique.mockResolvedValue(
        makeDeck({ isSystem: false, createdById: 'u1' }),
      );
      prisma.deck.update.mockResolvedValue(
        makeDeck({ isSystem: false, createdById: 'u1', title: 'Renamed' }),
      );

      const result = await service.update('d1', { title: 'Renamed' } as never, 'u1');

      expect(prisma.deck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'd1' },
          data: { title: 'Renamed' },
        }),
      );
      expect(result).toMatchObject({ title: 'Renamed', wordCount: 3 });
    });

    it('throws NotFound when the deck does not exist', async () => {
      prisma.deck.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { title: 'x' } as never, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Forbidden when the deck is a system deck', async () => {
      prisma.deck.findUnique.mockResolvedValue(
        makeDeck({ isSystem: true, createdById: null }),
      );

      await expect(
        service.update('d1', { title: 'x' } as never, 'u1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.deck.update).not.toHaveBeenCalled();
    });

    it('throws Forbidden when the deck belongs to another user', async () => {
      prisma.deck.findUnique.mockResolvedValue(
        makeDeck({ isSystem: false, createdById: 'other' }),
      );

      await expect(
        service.update('d1', { title: 'x' } as never, 'u1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('deletes an owned deck', async () => {
      prisma.deck.findUnique.mockResolvedValue(
        makeDeck({ isSystem: false, createdById: 'u1' }),
      );

      const result = await service.remove('d1', 'u1');

      expect(prisma.deck.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
      expect(result.message).toBe('Deck deleted successfully');
    });

    it('throws Forbidden when deleting a system deck', async () => {
      prisma.deck.findUnique.mockResolvedValue(
        makeDeck({ isSystem: true, createdById: null }),
      );

      await expect(service.remove('d1', 'u1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.deck.delete).not.toHaveBeenCalled();
    });
  });

  describe('addWords', () => {
    it('creates words tied to the deck and returns the new wordCount', async () => {
      prisma.deck.findUnique.mockResolvedValue(
        makeDeck({ isSystem: false, createdById: 'u1' }),
      );
      prisma.word.count.mockResolvedValue(2);

      const result = await service.addWords(
        'd1',
        {
          words: [
            { word: 'a', translation: 'A' },
            { word: 'b', translation: 'B' },
          ],
        } as never,
        'u1',
      );

      expect(prisma.word.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({ word: 'a', deckId: 'd1', createdById: 'u1' }),
            expect.objectContaining({ word: 'b', deckId: 'd1', createdById: 'u1' }),
          ],
        }),
      );
      expect(result).toMatchObject({ addedCount: 2, wordCount: 2 });
    });

    it('throws Forbidden when adding words to a system deck', async () => {
      prisma.deck.findUnique.mockResolvedValue(
        makeDeck({ isSystem: true, createdById: null }),
      );

      await expect(
        service.addWords('d1', { words: [{ word: 'a', translation: 'A' }] } as never, 'u1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.word.createMany).not.toHaveBeenCalled();
    });
  });

  describe('removeWord', () => {
    it('deletes a word that belongs to the owned deck', async () => {
      prisma.deck.findUnique.mockResolvedValue(
        makeDeck({ isSystem: false, createdById: 'u1' }),
      );
      prisma.word.findUnique.mockResolvedValue({ id: 'w1', deckId: 'd1' });

      const result = await service.removeWord('d1', 'w1', 'u1');

      expect(prisma.word.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
      expect(result.message).toBe('Word removed from deck');
    });

    it('throws NotFound when the word is not in this deck', async () => {
      prisma.deck.findUnique.mockResolvedValue(
        makeDeck({ isSystem: false, createdById: 'u1' }),
      );
      prisma.word.findUnique.mockResolvedValue({ id: 'w1', deckId: 'other-deck' });

      await expect(service.removeWord('d1', 'w1', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.word.delete).not.toHaveBeenCalled();
    });
  });
});
