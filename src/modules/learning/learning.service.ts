import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma, ReviewRating, WordStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewWordDto } from './dto/review-word.dto';
import {
  DailyWordResponseDto,
  ReviewResultDto,
} from './dto/daily-word-response.dto';
import { sm2 } from '../../common/utils/sm2';

@Injectable()
export class LearningService {
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

  async getDailyWords(
    userId: string,
    tzOffsetMinutes = 0,
  ): Promise<DailyWordResponseDto[]> {
    // The daily batch = cards whose nextReviewAt has come due, unfinished cards
    // already introduced, plus a capped slice of never-seen cards. Each fresh
    // card is stamped once so repeated requests cannot bypass the per-day cap.
    const now = new Date();
    const offset = Math.max(-840, Math.min(840, Math.trunc(tzOffsetMinutes)));
    const localNow = new Date(now.getTime() + offset * 60_000);
    const startOfLocalDay = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
      ) -
        offset * 60_000,
    );
    let batch:
      | {
          due: Prisma.UserWordGetPayload<{ include: { word: true } }>[];
          pendingIntroduced: Prisma.UserWordGetPayload<{
            include: { word: true };
          }>[];
          fresh: Prisma.UserWordGetPayload<{ include: { word: true } }>[];
        }
      | undefined;
    for (let attempt = 0; ; attempt++) {
      try {
        batch = await this.prisma.$transaction(
          async (tx) => {
            const [user, due, introducedToday, pendingIntroduced] =
              await Promise.all([
                tx.user.findUnique({
                  where: { id: userId },
                  select: { dailyNewLimit: true },
                }),
                tx.userWord.findMany({
                  where: { userId, nextReviewAt: { not: null, lte: now } },
                  include: { word: true },
                  orderBy: { nextReviewAt: 'asc' },
                  take: this.DUE_LIMIT,
                }),
                tx.userWord.count({
                  where: { userId, introducedAt: { gte: startOfLocalDay } },
                }),
                tx.userWord.findMany({
                  where: {
                    userId,
                    nextReviewAt: null,
                    introducedAt: { not: null },
                  },
                  include: { word: true },
                  orderBy: { introducedAt: 'asc' },
                  take: 50,
                }),
              ]);
            const remaining = Math.max(
              0,
              (user?.dailyNewLimit ?? 10) - introducedToday,
            );
            const fresh =
              remaining === 0
                ? []
                : await tx.userWord.findMany({
                    where: { userId, nextReviewAt: null, introducedAt: null },
                    include: { word: true },
                    orderBy: { createdAt: 'asc' },
                    take: remaining,
                  });
            if (fresh.length) {
              await tx.userWord.updateMany({
                where: {
                  id: { in: fresh.map((card) => card.id) },
                  introducedAt: null,
                },
                data: { introducedAt: now },
              });
            }
            return { due, pendingIntroduced, fresh };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        break;
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2034' || attempt >= 2)
          throw error;
      }
    }

    return [...batch!.due, ...batch!.pendingIntroduced, ...batch!.fresh].map(
      (uw) =>
        plainToInstance(
          DailyWordResponseDto,
          {
            id: uw.id,
            wordId: uw.word.id,
            word: uw.word.word,
            translation: uw.word.translation,
            pronunciation: uw.word.pronunciation,
            partOfSpeech: uw.word.partOfSpeech,
            collocations: uw.word.collocations,
            audioUrl: uw.word.audioUrl,
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
    let updated: Prisma.UserWordGetPayload<{ include: { word: true } }>;
    try {
      updated = await this.prisma.$transaction(async (tx) => {
        if (dto.requestId) {
          const alreadyApplied = await tx.review.findUnique({
            where: { requestId: dto.requestId },
          });
          if (alreadyApplied) {
            if (alreadyApplied.userId !== userId) {
              throw new NotFoundException('Review request not found');
            }
            const existingCard = await tx.userWord.findFirst({
              where: { id: dto.userWordId, userId },
              include: { word: true },
            });
            if (!existingCard) {
              throw new NotFoundException(
                'Word not found in your learning list',
              );
            }
            return existingCard;
          }
        }
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
          now.getTime() - userWord.lastReviewedAt.getTime() <
            this.REVIEW_DEDUP_MS
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
            requestId: dto.requestId,
            // Rating (SM-2 util enum) is value-identical to ReviewRating (Prisma).
            rating: dto.rating as unknown as ReviewRating,
          },
        });

        return result;
      });
    } catch (error) {
      // Two retries may race before either transaction creates its request row.
      // The unique requestId index elects one winner; the loser reads that
      // committed result and responds as an idempotent retry.
      if (!dto.requestId || (error as { code?: string }).code !== 'P2002') {
        throw error;
      }
      const alreadyApplied = await this.prisma.review.findUnique({
        where: { requestId: dto.requestId },
      });
      if (!alreadyApplied || alreadyApplied.userId !== userId) throw error;
      const recoveredCard = await this.prisma.userWord.findFirst({
        where: { id: dto.userWordId, userId },
        include: { word: true },
      });
      if (!recoveredCard) {
        throw new NotFoundException('Word not found in your learning list');
      }
      updated = recoveredCard;
    }

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
