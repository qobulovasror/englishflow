import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ReviewRating, WordStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewWordDto } from './dto/review-word.dto';
import {
  DailyWordResponseDto,
  ReviewResultDto,
} from './dto/daily-word-response.dto';
import { sm2 } from '../../common/utils/sm2';

@Injectable()
export class LearningService {
  // Cap on brand-new cards introduced per /daily pull. Once reviewed a card
  // gets a nextReviewAt and is no longer "new", so in a single daily session
  // this effectively bounds new cards/day — an Anki-style guard against a fresh
  // deck dumping hundreds of unseen words at once.
  private readonly DAILY_NEW_LIMIT = 20;
  // Safety cap on how many overdue reviews to return in one pull.
  private readonly DUE_LIMIT = 100;
  // Anki's "mature" threshold: an interval of 21+ days means the word is
  // effectively learned.
  private readonly MATURE_INTERVAL_DAYS = 21;
  // A repeat review of the SAME card within this window is treated as a
  // double-tap / retry and ignored (no second Review row, no SM-2 re-run).
  private readonly REVIEW_DEDUP_MS = 2000;

  constructor(private readonly prisma: PrismaService) {}

  private statusFor(interval: number): WordStatus {
    return interval >= this.MATURE_INTERVAL_DAYS
      ? WordStatus.LEARNED
      : WordStatus.LEARNING;
  }

  async getDailyWords(userId: string): Promise<DailyWordResponseDto[]> {
    // The daily batch = cards whose nextReviewAt has come due, plus a capped
    // slice of never-seen cards. SM-2 schedules each card independently via
    // nextReviewAt, so there is no global 24h cooldown anymore — a card seen
    // today simply won't be due again until its interval elapses.
    const now = new Date();

    const [due, fresh] = await this.prisma.$transaction([
      this.prisma.userWord.findMany({
        where: { userId, nextReviewAt: { not: null, lte: now } },
        include: { word: true },
        orderBy: { nextReviewAt: 'asc' },
        take: this.DUE_LIMIT,
      }),
      this.prisma.userWord.findMany({
        where: { userId, nextReviewAt: null },
        include: { word: true },
        orderBy: { createdAt: 'asc' },
        take: this.DAILY_NEW_LIMIT,
      }),
    ]);

    return [...due, ...fresh].map((uw) =>
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

  async reviewWord(
    dto: ReviewWordDto,
    userId: string,
  ): Promise<ReviewResultDto> {
    const now = new Date();

    // Read the card, re-run SM-2 and append the review log in ONE transaction —
    // the daily count and streaks read from the log, so it must never drift from
    // the card state. Reading inside the transaction (not before) also keeps the
    // SM-2 input current.
    const updated = await this.prisma.$transaction(async (tx) => {
      const userWord = await tx.userWord.findFirst({
        where: { id: dto.userWordId, userId },
        include: { word: true },
      });

      if (!userWord) {
        throw new NotFoundException('Word not found in your learning list');
      }

      // Idempotency guard against double-taps / retries: a repeat review of the
      // same card within REVIEW_DEDUP_MS is a no-op (returning the current
      // state) so it can't inflate today's count/streak or re-grade from stale
      // state.
      if (
        userWord.lastReviewedAt &&
        now.getTime() - userWord.lastReviewedAt.getTime() < this.REVIEW_DEDUP_MS
      ) {
        return userWord;
      }

      const next = sm2(
        {
          repetitionCount: userWord.repetitionCount,
          easeFactor: userWord.easeFactor,
          interval: userWord.interval,
          lapses: userWord.lapses,
        },
        dto.rating,
        now,
      );

      const result = await tx.userWord.update({
        where: { id: userWord.id },
        data: {
          repetitionCount: next.repetitionCount,
          easeFactor: next.easeFactor,
          interval: next.interval,
          lapses: next.lapses,
          nextReviewAt: next.nextReviewAt,
          status: this.statusFor(next.interval),
          lastReviewedAt: now,
        },
        include: { word: true },
      });

      await tx.review.create({
        data: {
          userId,
          wordId: userWord.wordId,
          // Rating (SM-2 util enum) is value-identical to ReviewRating (Prisma).
          rating: dto.rating as unknown as ReviewRating,
        },
      });

      return result;
    });

    return plainToInstance(
      ReviewResultDto,
      {
        id: updated.id,
        word: updated.word.word,
        status: updated.status,
        repetitionCount: updated.repetitionCount,
        interval: updated.interval,
        nextReviewAt: updated.nextReviewAt,
      },
      { excludeExtraneousValues: true },
    );
  }
}
