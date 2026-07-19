import { Test, TestingModule } from '@nestjs/testing';
import { WordStatus } from '@prisma/client';
import { ProgressService } from './progress.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProgressService', () => {
  let service: ProgressService;
  let prisma: {
    userWord: { count: jest.Mock; findMany: jest.Mock };
    test: { findMany: jest.Mock; count: jest.Mock; aggregate: jest.Mock };
    user: { findUnique: jest.Mock };
    review: { count: jest.Mock; findMany: jest.Mock };
    deck: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      userWord: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      test: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _avg: { score: null } }),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ dailyGoal: 20 }) },
      review: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      deck: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ProgressService);
  });

  it('returns a zeroed streak section for a user with no reviews', async () => {
    const res = await service.getUserProgress('u1');

    expect(res.streak).toEqual({
      current: 0,
      longest: 0,
      todayCount: 0,
      dailyGoal: 20,
      goalMet: false,
    });
  });

  it('computes current/longest from the review createdAt list', async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    prisma.review.findMany.mockResolvedValue([
      { createdAt: yesterday },
      { createdAt: today },
    ]);
    prisma.review.count.mockResolvedValue(3);

    const res = await service.getUserProgress('u1');

    expect(res.streak.current).toBe(2);
    expect(res.streak.longest).toBe(2);
    expect(res.streak.todayCount).toBe(3);
  });

  it('marks the goal met when todayCount reaches dailyGoal', async () => {
    prisma.user.findUnique.mockResolvedValue({ dailyGoal: 5 });
    prisma.review.count.mockResolvedValue(5);

    const res = await service.getUserProgress('u1');

    expect(res.streak).toMatchObject({
      todayCount: 5,
      dailyGoal: 5,
      goalMet: true,
    });
  });

  it('queries today reviews with a start-of-day lower bound', async () => {
    await service.getUserProgress('u1');

    const arg = prisma.review.count.mock.calls[0][0];
    expect(arg.where.userId).toBe('u1');
    expect(arg.where.createdAt.gte).toBeInstanceOf(Date);
  });

  it('bounds the streak review scan to the last ~year', async () => {
    await service.getUserProgress('u1');

    const arg = prisma.review.findMany.mock.calls[0][0];
    expect(arg.where.userId).toBe('u1');
    const gte = arg.where.createdAt.gte as Date;
    expect(gte).toBeInstanceOf(Date);
    // Roughly 366 days back (allow a day of slack for the UTC truncation).
    const daysBack = (Date.now() - gte.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysBack).toBeGreaterThan(364);
    expect(daysBack).toBeLessThan(368);
  });

  describe('getDeckProgress', () => {
    it('counts the user statuses per deck and computes the percentage', async () => {
      prisma.deck.findMany.mockResolvedValue([
        {
          id: 'd1',
          title: 'Travel',
          level: 'A2',
          isSystem: true,
          words: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }, { id: 'w4' }],
        },
      ]);
      prisma.userWord.findMany.mockResolvedValue([
        { wordId: 'w1', status: WordStatus.NEW },
        { wordId: 'w2', status: WordStatus.LEARNING },
        { wordId: 'w3', status: WordStatus.LEARNED },
        // w4 has no UserWord row → excluded from the totals.
      ]);

      const res = await service.getDeckProgress('u1');

      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        id: 'd1',
        title: 'Travel',
        level: 'A2',
        isSystem: true,
        total: 3,
        new: 1,
        learning: 1,
        learned: 1,
        progressPercentage: 33,
      });
    });

    it('skips the userWord lookup and returns [] when no decks match', async () => {
      prisma.deck.findMany.mockResolvedValue([]);

      const res = await service.getDeckProgress('u1');

      expect(res).toEqual([]);
      expect(prisma.userWord.findMany).not.toHaveBeenCalled();
    });

    it('sorts system decks first, then by title', async () => {
      prisma.deck.findMany.mockResolvedValue([
        { id: 'd1', title: 'Zebra', isSystem: false, level: null, words: [] },
        { id: 'd2', title: 'Beta', isSystem: true, level: null, words: [] },
        { id: 'd3', title: 'Alpha', isSystem: true, level: null, words: [] },
      ]);

      const res = await service.getDeckProgress('u1');

      expect(res.map((d) => d.title)).toEqual(['Alpha', 'Beta', 'Zebra']);
    });
  });

  describe('getLeeches', () => {
    it('filters by lapses >= 4 and shapes the rows', async () => {
      prisma.userWord.findMany.mockResolvedValue([
        {
          wordId: 'w1',
          status: WordStatus.LEARNING,
          lapses: 6,
          lastReviewedAt: new Date('2026-06-20'),
          word: { word: 'ubiquitous', translation: 'hamma joyda' },
        },
      ]);

      const res = await service.getLeeches('u1');

      const arg = prisma.userWord.findMany.mock.calls[0][0];
      expect(arg.where).toMatchObject({ userId: 'u1', lapses: { gte: 4 } });
      expect(arg.take).toBe(50);
      expect(arg.orderBy).toEqual([
        { lapses: 'desc' },
        { lastReviewedAt: 'desc' },
      ]);

      expect(res).toEqual([
        {
          wordId: 'w1',
          word: 'ubiquitous',
          translation: 'hamma joyda',
          lapses: 6,
          status: WordStatus.LEARNING,
          lastReviewedAt: new Date('2026-06-20'),
        },
      ]);
    });
  });

  describe('getTrends', () => {
    it('returns a dense series of the requested length, oldest→newest', async () => {
      prisma.review.findMany.mockResolvedValue([{ createdAt: new Date() }]);

      const res = await service.getTrends('u1', 7);

      expect(res).toHaveLength(7);
      for (let i = 1; i < res.length; i++) {
        expect(res[i].date > res[i - 1].date).toBe(true);
      }
      // Today (last slot) reflects the single seeded review.
      expect(res[6].count).toBe(1);
      expect(res.slice(0, 6).every((p) => p.count === 0)).toBe(true);
    });
  });
});
