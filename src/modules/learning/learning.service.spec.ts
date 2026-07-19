import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WordStatus } from '@prisma/client';
import { LearningService } from './learning.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Rating } from '../../common/utils/sm2';

type MockedPrisma = {
  userWord: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  review: {
    create: jest.Mock;
  };
  $transaction: jest.Mock;
};

const WORD = {
  id: 'w1',
  word: 'serendipity',
  translation: 'kutilmagan',
  example: null,
};

function makeUserWord(
  overrides: Partial<{
    id: string;
    status: WordStatus;
    repetitionCount: number;
    easeFactor: number;
    interval: number;
    nextReviewAt: Date | null;
    lapses: number;
    lastReviewedAt: Date | null;
  }> = {},
) {
  return {
    id: 'uw1',
    userId: 'u1',
    wordId: 'w1',
    status: WordStatus.NEW,
    repetitionCount: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReviewAt: null,
    lapses: 0,
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
      review: {
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
      },
      // Supports both forms: the array form (due + new daily queries) resolves
      // via Promise.all; the interactive form (reviewWord) is called with the
      // stub itself as the transaction client.
      $transaction: jest.fn((input: unknown) =>
        typeof input === 'function'
          ? (input as (tx: MockedPrisma) => Promise<unknown>)(prisma)
          : Promise.all(input as Promise<unknown>[]),
      ),
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
    it('returns due cards followed by capped new cards', async () => {
      // First findMany call = due reviews, second = fresh/new cards.
      prisma.userWord.findMany
        .mockResolvedValueOnce([
          makeUserWord({
            id: 'due',
            status: WordStatus.LEARNING,
            nextReviewAt: new Date('2020-01-01'),
          }),
        ])
        .mockResolvedValueOnce([
          makeUserWord({ id: 'new', status: WordStatus.NEW }),
        ]);

      const result = await service.getDailyWords('u1');

      // Due query: only cards whose nextReviewAt has elapsed.
      expect(prisma.userWord.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'u1',
            nextReviewAt: expect.objectContaining({ not: null }),
          }),
        }),
      );
      // New query: never-reviewed cards, capped at the daily new limit.
      expect(prisma.userWord.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { userId: 'u1', nextReviewAt: null },
          take: 20,
        }),
      );
      expect(result.map((r) => r.id)).toEqual(['due', 'new']);
    });

    it('flattens nested word data into the response shape', async () => {
      prisma.userWord.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeUserWord({ id: 'a', repetitionCount: 3 })]);

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
    const captureUpdate = () =>
      prisma.userWord.update.mockImplementation(async ({ data }) => ({
        ...makeUserWord(),
        ...data,
        word: WORD,
      }));

    it('throws NotFound when the userWord is not in the user list', async () => {
      prisma.userWord.findFirst.mockResolvedValue(null);

      await expect(
        service.reviewWord(
          { userWordId: 'missing', rating: Rating.GOOD },
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('schedules a brand-new GOOD card one day out and starts LEARNING', async () => {
      prisma.userWord.findFirst.mockResolvedValue(makeUserWord());
      captureUpdate();

      await service.reviewWord(
        { userWordId: 'uw1', rating: Rating.GOOD },
        'u1',
      );

      const { data } = prisma.userWord.update.mock.calls[0][0];
      expect(data.repetitionCount).toBe(1);
      expect(data.interval).toBe(1);
      expect(data.status).toBe(WordStatus.LEARNING);
      expect(data.nextReviewAt).toBeInstanceOf(Date);
    });

    it('resets the streak and records a lapse on AGAIN for a mature card', async () => {
      prisma.userWord.findFirst.mockResolvedValue(
        makeUserWord({
          status: WordStatus.LEARNED,
          repetitionCount: 5,
          interval: 30,
          lapses: 0,
        }),
      );
      captureUpdate();

      await service.reviewWord(
        { userWordId: 'uw1', rating: Rating.AGAIN },
        'u1',
      );

      const { data } = prisma.userWord.update.mock.calls[0][0];
      expect(data.repetitionCount).toBe(0);
      expect(data.interval).toBe(0); // relearning step, due again shortly
      expect(data.lapses).toBe(1);
      expect(data.status).toBe(WordStatus.LEARNING);
    });

    it('ignores a repeat review of the same card within the dedup window', async () => {
      // Card was reviewed a moment ago — a double-tap must not write again.
      prisma.userWord.findFirst.mockResolvedValue(
        makeUserWord({ lastReviewedAt: new Date() }),
      );

      await service.reviewWord(
        { userWordId: 'uw1', rating: Rating.GOOD },
        'u1',
      );

      expect(prisma.userWord.update).not.toHaveBeenCalled();
      expect(prisma.review.create).not.toHaveBeenCalled();
    });

    it('marks a card LEARNED once its interval reaches the mature threshold', async () => {
      // interval 6, EF 2.5 -> next interval = round(6*2.5) = 15 (still LEARNING)
      // bump interval so the next step crosses 21 days.
      prisma.userWord.findFirst.mockResolvedValue(
        makeUserWord({
          status: WordStatus.LEARNING,
          repetitionCount: 2,
          interval: 10,
          easeFactor: 2.5,
        }),
      );
      captureUpdate();

      await service.reviewWord(
        { userWordId: 'uw1', rating: Rating.GOOD },
        'u1',
      );

      const { data } = prisma.userWord.update.mock.calls[0][0];
      expect(data.interval).toBe(25); // round(10 * 2.5)
      expect(data.status).toBe(WordStatus.LEARNED);
    });

    it('records the review timestamp', async () => {
      prisma.userWord.findFirst.mockResolvedValue(makeUserWord());
      captureUpdate();

      const before = Date.now();
      await service.reviewWord(
        { userWordId: 'uw1', rating: Rating.AGAIN },
        'u1',
      );
      const after = Date.now();

      const { data } = prisma.userWord.update.mock.calls[0][0];
      const ts = (data.lastReviewedAt as Date).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('appends a review log row in the same transaction', async () => {
      prisma.userWord.findFirst.mockResolvedValue(
        makeUserWord({ wordId: 'w1' }),
      );
      captureUpdate();

      await service.reviewWord(
        { userWordId: 'uw1', rating: Rating.GOOD },
        'u1',
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction.mock.calls[0][0]).toEqual(
        expect.any(Function),
      );
      expect(prisma.review.create).toHaveBeenCalledWith({
        data: { userId: 'u1', wordId: 'w1', rating: Rating.GOOD },
      });
    });

    it('returns a ReviewResultDto with only the documented fields', async () => {
      prisma.userWord.findFirst.mockResolvedValue(makeUserWord());
      prisma.userWord.update.mockResolvedValue({
        ...makeUserWord({
          status: WordStatus.LEARNING,
          repetitionCount: 1,
          interval: 1,
          nextReviewAt: new Date(),
        }),
        word: WORD,
      });

      const result = await service.reviewWord(
        { userWordId: 'uw1', rating: Rating.GOOD },
        'u1',
      );

      expect(Object.keys(result).sort()).toEqual(
        [
          'id',
          'interval',
          'nextReviewAt',
          'repetitionCount',
          'status',
          'word',
        ].sort(),
      );
    });
  });
});
