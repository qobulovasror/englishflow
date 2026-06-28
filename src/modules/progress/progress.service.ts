import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { WordStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressResponseDto } from './dto/progress-response.dto';
import { computeStreaks } from '../../common/utils/streak';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserProgress(userId: string): Promise<ProgressResponseDto> {
    // Start of the current UTC day — reviews on/after this count toward today.
    const now = new Date();
    const startOfTodayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const todayUtcString = now.toISOString().slice(0, 10);

    const [
      totalWords,
      newWords,
      learningWords,
      learnedWords,
      tests,
      totalTests,
      averageScoreAgg,
      user,
      todayCount,
      reviewDays,
    ] = await Promise.all([
      this.prisma.userWord.count({ where: { userId } }),
      this.prisma.userWord.count({ where: { userId, status: WordStatus.NEW } }),
      this.prisma.userWord.count({ where: { userId, status: WordStatus.LEARNING } }),
      this.prisma.userWord.count({ where: { userId, status: WordStatus.LEARNED } }),
      this.prisma.test.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          score: true,
          createdAt: true,
          _count: { select: { questions: true } },
        },
      }),
      this.prisma.test.count({ where: { userId } }),
      this.prisma.test.aggregate({
        where: { userId },
        _avg: { score: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { dailyGoal: true },
      }),
      this.prisma.review.count({
        where: { userId, createdAt: { gte: startOfTodayUtc } },
      }),
      this.prisma.review.findMany({
        where: { userId },
        select: { createdAt: true },
      }),
    ]);

    const dailyGoal = user?.dailyGoal ?? 20;
    const activeDays = reviewDays.map((r) => r.createdAt.toISOString().slice(0, 10));
    const { current, longest } = computeStreaks(activeDays, todayUtcString);
    const goalMet = todayCount >= dailyGoal;

    return plainToInstance(
      ProgressResponseDto,
      {
        vocabulary: {
          total: totalWords,
          new: newWords,
          learning: learningWords,
          learned: learnedWords,
          progressPercentage:
            totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0,
        },
        tests: {
          total: totalTests,
          averageScore: averageScoreAgg._avg.score ?? 0,
          recent: tests.map((t) => ({
            id: t.id,
            score: t.score,
            totalQuestions: t._count.questions,
            createdAt: t.createdAt,
          })),
        },
        streak: {
          current,
          longest,
          todayCount,
          dailyGoal,
          goalMet,
        },
      },
      { excludeExtraneousValues: true },
    );
  }
}
