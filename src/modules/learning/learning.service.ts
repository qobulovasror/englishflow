import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { WordStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewWordDto } from './dto/review-word.dto';
import {
  DailyWordResponseDto,
  ReviewResultDto,
} from './dto/daily-word-response.dto';

@Injectable()
export class LearningService {
  private readonly DAILY_WORD_LIMIT = 10;

  constructor(private readonly prisma: PrismaService) {}

  async getDailyWords(userId: string): Promise<DailyWordResponseDto[]> {
    // Words reviewed within the last 24h are excluded — otherwise the same
    // 10 words would come back over and over inside a single session, with
    // no sense of "today's batch is done". A proper spaced-repetition
    // algorithm (SM-2/FSRS) needs an explicit `nextReviewAt` column on
    // UserWord; that's a future migration. This is the cheapest correctness
    // win without a schema change.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const words = await this.prisma.userWord.findMany({
      where: {
        userId,
        status: { in: [WordStatus.NEW, WordStatus.LEARNING] },
        OR: [
          { lastReviewedAt: null },
          { lastReviewedAt: { lt: oneDayAgo } },
        ],
      },
      include: { word: true },
      take: this.DAILY_WORD_LIMIT,
      orderBy: [
        { lastReviewedAt: { sort: 'asc', nulls: 'first' } },
        { repetitionCount: 'asc' },
      ],
    });

    return words.map((uw) =>
      plainToInstance(
        DailyWordResponseDto,
        {
          id: uw.id,
          wordId: uw.word.id,
          word: uw.word.word,
          translation: uw.word.translation,
          example: uw.word.example,
          status: uw.status,
          repetitionCount: uw.repetitionCount,
        },
        { excludeExtraneousValues: true },
      ),
    );
  }

  async reviewWord(dto: ReviewWordDto, userId: string): Promise<ReviewResultDto> {
    const userWord = await this.prisma.userWord.findFirst({
      where: { id: dto.userWordId, userId },
    });

    if (!userWord) {
      throw new NotFoundException('Word not found in your learning list');
    }

    const newRepetitionCount = userWord.repetitionCount + 1;
    let newStatus: WordStatus = userWord.status;

    if (dto.correct) {
      if (newRepetitionCount >= 5) {
        newStatus = WordStatus.LEARNED;
      } else if (newRepetitionCount >= 2) {
        newStatus = WordStatus.LEARNING;
      }
    }

    const updated = await this.prisma.userWord.update({
      where: { id: userWord.id },
      data: {
        repetitionCount: newRepetitionCount,
        status: newStatus,
        lastReviewedAt: new Date(),
      },
      include: { word: true },
    });

    return plainToInstance(
      ReviewResultDto,
      {
        id: updated.id,
        word: updated.word.word,
        status: updated.status,
        repetitionCount: updated.repetitionCount,
      },
      { excludeExtraneousValues: true },
    );
  }
}
