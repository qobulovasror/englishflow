import { Injectable, NotFoundException } from '@nestjs/common';
import { WordStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewWordDto } from './dto/review-word.dto';

@Injectable()
export class LearningService {
  private readonly DAILY_WORD_LIMIT = 10;

  constructor(private readonly prisma: PrismaService) {}

  async getDailyWords(userId: string) {
    const words = await this.prisma.userWord.findMany({
      where: {
        userId,
        status: { in: [WordStatus.NEW, WordStatus.LEARNING] },
      },
      include: { word: true },
      take: this.DAILY_WORD_LIMIT,
      orderBy: [
        { lastReviewedAt: 'asc' },
        { repetitionCount: 'asc' },
      ],
    });

    return words.map((uw) => ({
      id: uw.id,
      wordId: uw.word.id,
      word: uw.word.word,
      translation: uw.word.translation,
      example: uw.word.example,
      status: uw.status,
      repetitionCount: uw.repetitionCount,
    }));
  }

  async reviewWord(dto: ReviewWordDto, userId: string) {
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

    return {
      id: updated.id,
      word: updated.word.word,
      status: updated.status,
      repetitionCount: updated.repetitionCount,
    };
  }
}
