import { Test, TestingModule } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProgressService', () => {
  let service: ProgressService;
  let prisma: {
    userWord: { count: jest.Mock };
    test: { findMany: jest.Mock; count: jest.Mock; aggregate: jest.Mock };
    user: { findUnique: jest.Mock };
    review: { count: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      userWord: { count: jest.fn().mockResolvedValue(0) },
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

    expect(res.streak).toMatchObject({ todayCount: 5, dailyGoal: 5, goalMet: true });
  });

  it('queries today reviews with a start-of-day lower bound', async () => {
    await service.getUserProgress('u1');

    const arg = prisma.review.count.mock.calls[0][0];
    expect(arg.where.userId).toBe('u1');
    expect(arg.where.createdAt.gte).toBeInstanceOf(Date);
  });
});
