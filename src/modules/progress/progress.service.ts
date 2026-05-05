import { Injectable } from '@nestjs/common';
import { WordStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserProgress(userId: string) {
    const totalWords = await this.prisma.userWord.count({
      where: { userId },
    });

    const newWords = await this.prisma.userWord.count({
      where: { userId, status: WordStatus.NEW },
    });

    const learningWords = await this.prisma.userWord.count({
      where: { userId, status: WordStatus.LEARNING },
    });

    const learnedWords = await this.prisma.userWord.count({
      where: { userId, status: WordStatus.LEARNED },
    });

    const tests = await this.prisma.test.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        score: true,
        createdAt: true,
        _count: { select: { questions: true } },
      },
    });

    const totalTests = await this.prisma.test.count({ where: { userId } });

    const averageScore = totalTests > 0
      ? await this.prisma.test.aggregate({
          where: { userId },
          _avg: { score: true },
        })
      : null;

    return {
      vocabulary: {
        total: totalWords,
        new: newWords,
        learning: learningWords,
        learned: learnedWords,
        progressPercentage: totalWords > 0
          ? Math.round((learnedWords / totalWords) * 100)
          : 0,
      },
      tests: {
        total: totalTests,
        averageScore: averageScore?._avg?.score ?? 0,
        recent: tests.map((t) => ({
          id: t.id,
          score: t.score,
          totalQuestions: t._count.questions,
          createdAt: t.createdAt,
        })),
      },
    };
  }
}
