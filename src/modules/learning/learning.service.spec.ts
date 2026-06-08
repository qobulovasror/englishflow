import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WordStatus } from '@prisma/client';
import { LearningService } from './learning.service';
import { PrismaService } from '../../prisma/prisma.service';

type MockedPrisma = {
  userWord: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

const WORD = {
  id: 'w1',
  word: 'serendipity',
  translation: 'kutilmagan',
  example: null,
};

function makeUserWord(overrides: Partial<{
  id: string;
  status: WordStatus;
  repetitionCount: number;
}> = {}) {
  return {
    id: 'uw1',
    userId: 'u1',
    wordId: 'w1',
    status: WordStatus.NEW,
    repetitionCount: 0,
    lastReviewedAt: null,
    word: WORD,
    ...overrides,
  };
}

describe('LearningService', () => {
  let service: LearningService;
  let prisma: MockedPrisma;

  beforeEach(async () => {
    prisma = {
      userWord: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(LearningService);
  });

  describe('getDailyWords', () => {
    it('returns up to DAILY_WORD_LIMIT items filtered to NEW/LEARNING', async () => {
      prisma.userWord.findMany.mockResolvedValue([
        makeUserWord({ id: 'a', status: WordStatus.NEW }),
        makeUserWord({ id: 'b', status: WordStatus.LEARNING }),
      ]);

      const result = await service.getDailyWords('u1');

      expect(prisma.userWord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'u1',
            status: { in: ['NEW', 'LEARNING'] },
          }),
          take: 10,
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a');
      expect(result[1].status).toBe(WordStatus.LEARNING);
    });

    it('flattens nested word data into the response shape', async () => {
      prisma.userWord.findMany.mockResolvedValue([
        makeUserWord({ id: 'a', repetitionCount: 3 }),
      ]);

      const [item] = await service.getDailyWords('u1');

      expect(item).toMatchObject({
        id: 'a',
        wordId: WORD.id,
        word: WORD.word,
        translation: WORD.translation,
        status: WordStatus.NEW,
        repetitionCount: 3,
      });
    });
  });

  describe('reviewWord', () => {
    it('throws NotFound when the userWord is not in the user list', async () => {
      prisma.userWord.findFirst.mockResolvedValue(null);

      await expect(
        service.reviewWord({ userWordId: 'missing', correct: true }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does NOT transition status on incorrect answer (just bumps count)', async () => {
      prisma.userWord.findFirst.mockResolvedValue(
        makeUserWord({ status: WordStatus.NEW, repetitionCount: 0 }),
      );
      prisma.userWord.update.mockImplementation(async ({ data, where: _w }) => ({
        ...makeUserWord({ status: WordStatus.NEW, repetitionCount: 1 }),
        ...data,
        word: WORD,
      }));

      await service.reviewWord({ userWordId: 'uw1', correct: false }, 'u1');

      const call = prisma.userWord.update.mock.calls[0][0];
      expect(call.data.repetitionCount).toBe(1);
      expect(call.data.status).toBe(WordStatus.NEW); // unchanged
    });

    it('promotes NEW → LEARNING at repetitionCount ≥ 2 (on correct)', async () => {
      prisma.userWord.findFirst.mockResolvedValue(
        makeUserWord({ status: WordStatus.NEW, repetitionCount: 1 }),
      );
      prisma.userWord.update.mockImplementation(async ({ data }) => ({
        ...makeUserWord(),
        ...data,
        word: WORD,
      }));

      await service.reviewWord({ userWordId: 'uw1', correct: true }, 'u1');

      const call = prisma.userWord.update.mock.calls[0][0];
      expect(call.data.repetitionCount).toBe(2);
      expect(call.data.status).toBe(WordStatus.LEARNING);
    });

    it('promotes to LEARNED at repetitionCount ≥ 5 (on correct)', async () => {
      prisma.userWord.findFirst.mockResolvedValue(
        makeUserWord({ status: WordStatus.LEARNING, repetitionCount: 4 }),
      );
      prisma.userWord.update.mockImplementation(async ({ data }) => ({
        ...makeUserWord(),
        ...data,
        word: WORD,
      }));

      await service.reviewWord({ userWordId: 'uw1', correct: true }, 'u1');

      const call = prisma.userWord.update.mock.calls[0][0];
      expect(call.data.repetitionCount).toBe(5);
      expect(call.data.status).toBe(WordStatus.LEARNED);
    });

    it('keeps LEARNING on correct answer below the threshold', async () => {
      prisma.userWord.findFirst.mockResolvedValue(
        makeUserWord({ status: WordStatus.LEARNING, repetitionCount: 2 }),
      );
      prisma.userWord.update.mockImplementation(async ({ data }) => ({
        ...makeUserWord(),
        ...data,
        word: WORD,
      }));

      await service.reviewWord({ userWordId: 'uw1', correct: true }, 'u1');

      const call = prisma.userWord.update.mock.calls[0][0];
      expect(call.data.repetitionCount).toBe(3);
      expect(call.data.status).toBe(WordStatus.LEARNING);
    });

    it('records the review timestamp', async () => {
      prisma.userWord.findFirst.mockResolvedValue(makeUserWord());
      prisma.userWord.update.mockImplementation(async ({ data }) => ({
        ...makeUserWord(),
        ...data,
        word: WORD,
      }));

      const before = Date.now();
      await service.reviewWord({ userWordId: 'uw1', correct: false }, 'u1');
      const after = Date.now();

      const call = prisma.userWord.update.mock.calls[0][0];
      const ts = (call.data.lastReviewedAt as Date).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('returns a ReviewResultDto with only the documented fields', async () => {
      prisma.userWord.findFirst.mockResolvedValue(
        makeUserWord({ status: WordStatus.NEW, repetitionCount: 1 }),
      );
      prisma.userWord.update.mockResolvedValue({
        ...makeUserWord({ status: WordStatus.LEARNING, repetitionCount: 2 }),
        word: WORD,
      });

      const result = await service.reviewWord(
        { userWordId: 'uw1', correct: true },
        'u1',
      );

      expect(Object.keys(result).sort()).toEqual(
        ['id', 'repetitionCount', 'status', 'word'].sort(),
      );
    });
  });
});
