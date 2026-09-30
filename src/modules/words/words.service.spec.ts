import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WordStatus } from '@prisma/client';
import { WordsService } from './words.service';
import { PrismaService } from '../../prisma/prisma.service';

type MockedPrisma = {
  word: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    delete: jest.Mock;
  };
  userWord: { create: jest.Mock; count: jest.Mock };
  review: { count: jest.Mock };
  testQuestion: { count: jest.Mock };
  $transaction: jest.Mock;
};

function makeWord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'w1',
    word: 'serendipity',
    translation: 'kutilmagan kashfiyot',
    example: null,
    audioUrl: null,
    createdById: 'u1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('WordsService', () => {
  let service: WordsService;
  let prisma: MockedPrisma;

  beforeEach(async () => {
    prisma = {
      word: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        delete: jest.fn().mockResolvedValue({}),
      },
      userWord: {
        create: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      review: { count: jest.fn().mockResolvedValue(0) },
      testQuestion: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((input: unknown) =>
        typeof input === 'function'
          ? (input as (tx: unknown) => unknown)(prisma)
          : Promise.all(input as Promise<unknown>[]),
      ),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [WordsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(WordsService);
  });

  describe('create', () => {
    it('persists audioUrl when provided and returns it in the dto', async () => {
      const audioUrl = 'https://cdn.example.com/audio/serendipity.mp3';
      prisma.word.create.mockResolvedValue(makeWord({ audioUrl }));

      const result = await service.create(
        {
          word: 'serendipity',
          translation: 'kutilmagan kashfiyot',
          audioUrl,
        },
        'u1',
      );

      expect(prisma.word.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ audioUrl, createdById: 'u1' }),
      });
      expect(result.audioUrl).toBe(audioUrl);
    });
  });

  describe('update', () => {
    it('updates only the provided fields and returns the dto', async () => {
      prisma.word.findUnique.mockResolvedValue(makeWord());
      prisma.word.update.mockResolvedValue(
        makeWord({ translation: 'yangi tarjima' }),
      );

      const result = await service.update(
        'w1',
        { translation: 'yangi tarjima' },
        'u1',
      );

      expect(prisma.word.update).toHaveBeenCalledWith({
        where: { id: 'w1' },
        data: { translation: 'yangi tarjima' },
      });
      expect(result.translation).toBe('yangi tarjima');
    });

    it('throws NotFound when the word does not exist', async () => {
      prisma.word.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { word: 'x' }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.word.update).not.toHaveBeenCalled();
    });

    it('throws Forbidden when the word belongs to another user', async () => {
      prisma.word.findUnique.mockResolvedValue(
        makeWord({ createdById: 'other' }),
      );

      await expect(
        service.update('w1', { word: 'x' }, 'u1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.word.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('detaches a word in a deck to preserve other learners’ progress', async () => {
      prisma.word.findUnique.mockResolvedValue(makeWord({ deckId: 'd1' }));

      await service.remove('w1', 'u1');

      expect(prisma.word.update).toHaveBeenCalledWith({
        where: { id: 'w1' },
        data: { deckId: null, createdById: null },
      });
      expect(prisma.word.delete).not.toHaveBeenCalled();
    });

    it('deletes an unshared personal word', async () => {
      prisma.word.findUnique.mockResolvedValue(makeWord({ deckId: null }));

      await service.remove('w1', 'u1');

      expect(prisma.word.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
      expect(prisma.word.update).not.toHaveBeenCalled();
    });

    it('preserves a deckless word when learners have progress', async () => {
      prisma.word.findUnique.mockResolvedValue(makeWord({ deckId: null }));
      prisma.userWord.count.mockResolvedValue(1);
      await service.remove('w1', 'u1');
      expect(prisma.word.update).toHaveBeenCalledWith({
        where: { id: 'w1' },
        data: { deckId: null, createdById: null },
      });
      expect(prisma.word.delete).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it('filters by UserWord status when a status is provided', async () => {
      prisma.word.findMany.mockResolvedValue([]);
      prisma.word.count.mockResolvedValue(0);

      await service.findAllByUser('u1', {
        page: 1,
        limit: 20,
        status: WordStatus.NEW,
        skip: 0,
        take: 20,
      } as never);

      const expectedWhere = {
        createdById: 'u1',
        userWords: { some: { userId: 'u1', status: WordStatus.NEW } },
      };
      expect(prisma.word.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(prisma.word.count).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it('lists only by owner when no status is provided', async () => {
      await service.findAllByUser('u1', {
        page: 1,
        limit: 20,
        skip: 0,
        take: 20,
      } as never);

      expect(prisma.word.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdById: 'u1' } }),
      );
    });
  });
});
