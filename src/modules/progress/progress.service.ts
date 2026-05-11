import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { WordStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressResponseDto } from './dto/progress-response.dto';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserProgress(userId: string): Promise<ProgressResponseDto> {
    const [
      totalWords,
      newWords,
      learningWords,
      learnedWords,
      tests,
      totalTests,
      averageScoreAgg,
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
    ]);

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
      },
      { excludeExtraneousValues: true },
    );
  }
}
