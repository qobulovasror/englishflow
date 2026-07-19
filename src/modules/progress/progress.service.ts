import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { WordStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressResponseDto } from './dto/progress-response.dto';
import {
  DeckProgressDto,
  LeechWordDto,
  TrendPointDto,
} from './dto/analytics-response.dto';
import { computeStreaks } from '../../common/utils/streak';
import { bucketByDay } from '../../common/utils/trend';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// A word the user has failed this many times (or more) after it graduated to a
// real interval is a "leech" — surfaced so the user can give it extra attention.
const LEECH_LAPSE_THRESHOLD = 4;

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  // Clamp a client-supplied timezone offset (minutes east of UTC) to the real
  // ±14h range; anything missing/invalid falls back to UTC.
  private normalizeOffset(minutes?: number): number {
    if (minutes === undefined || Number.isNaN(minutes)) return 0;
    return Math.max(-840, Math.min(840, Math.trunc(minutes)));
  }

  // The local calendar-day string (YYYY-MM-DD) an instant falls on for `offset`.
  private localDay(instant: Date, offset: number): string {
    return new Date(instant.getTime() + offset * 60000)
      .toISOString()
      .slice(0, 10);
  }

  // The UTC instant at which the local day containing `instant` begins.
  private startOfLocalDayUtc(instant: Date, offset: number): Date {
    const local = new Date(instant.getTime() + offset * 60000);
    const localMidnight = Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate(),
    );
    return new Date(localMidnight - offset * 60000);
  }

  async getUserProgress(
    userId: string,
    tzOffsetMinutes?: number,
  ): Promise<ProgressResponseDto> {
    const offset = this.normalizeOffset(tzOffsetMinutes);
    const now = new Date();
    // Day boundaries are computed in the caller's timezone so a user reviewing
    // late evening / early morning local time isn't bucketed onto the wrong day
    // (which would break streaks and today's goal for non-UTC users).
    const startOfToday = this.startOfLocalDayUtc(now, offset);
    const todayString = this.localDay(now, offset);
    // Streaks only need recent activity (current streak + up to a 1-year
    // longest), so bound the scan to the last 366 days instead of every review
    // the user has ever logged.
    const streakWindowStart = new Date(
      startOfToday.getTime() - 366 * MS_PER_DAY,
    );

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
      this.prisma.userWord.count({
        where: { userId, status: WordStatus.LEARNING },
      }),
      this.prisma.userWord.count({
        where: { userId, status: WordStatus.LEARNED },
      }),
      this.prisma.test.findMany({
        // Only graded tests: startTest persists a score:0 row up front, so
        // counting in-progress/abandoned tests would pollute totals and drag
        // the average toward zero.
        where: { userId, submittedAt: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          score: true,
          createdAt: true,
          _count: { select: { questions: true } },
        },
      }),
      this.prisma.test.count({ where: { userId, submittedAt: { not: null } } }),
      this.prisma.test.aggregate({
        where: { userId, submittedAt: { not: null } },
        _avg: { score: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { dailyGoal: true },
      }),
      this.prisma.review.count({
        where: { userId, createdAt: { gte: startOfToday } },
      }),
      this.prisma.review.findMany({
        where: { userId, createdAt: { gte: streakWindowStart } },
        select: { createdAt: true },
      }),
    ]);

    const dailyGoal = user?.dailyGoal ?? 20;
    const activeDays = reviewDays.map((r) =>
      this.localDay(r.createdAt, offset),
    );
    const { current, longest } = computeStreaks(activeDays, todayString);
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

  // Daily review counts across a trailing `days`-long window ending today (in
  // the caller's timezone), zero-filled so the client gets a continuous series.
  async getTrends(
    userId: string,
    days: number,
    tzOffsetMinutes?: number,
  ): Promise<TrendPointDto[]> {
    const offset = this.normalizeOffset(tzOffsetMinutes);
    const now = new Date();
    const startOfToday = this.startOfLocalDayUtc(now, offset);
    // Include the whole first day of the window: today minus (days - 1) days.
    const windowStart = new Date(
      startOfToday.getTime() - (days - 1) * MS_PER_DAY,
    );
    const todayString = this.localDay(now, offset);

    const reviews = await this.prisma.review.findMany({
      where: { userId, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    });

    const series = bucketByDay(
      reviews.map((r) => r.createdAt),
      todayString,
      days,
      offset,
    );

    return series.map((p) =>
      plainToInstance(TrendPointDto, p, { excludeExtraneousValues: true }),
    );
  }

  // Per-deck learning progress for every deck the user joined or created.
  async getDeckProgress(userId: string): Promise<DeckProgressDto[]> {
    const decks = await this.prisma.deck.findMany({
      where: {
        deletedAt: null,
        OR: [{ enrollments: { some: { userId } } }, { createdById: userId }],
      },
      orderBy: [{ isSystem: 'desc' }, { title: 'asc' }],
      include: { words: { select: { id: true } } },
    });

    // One grouped lookup of the user's status for every word across all decks,
    // keyed by wordId — avoids an N+1 of per-deck status counts.
    const wordIds = decks.flatMap((d) => d.words.map((w) => w.id));
    const userWords =
      wordIds.length === 0
        ? []
        : await this.prisma.userWord.findMany({
            where: { userId, wordId: { in: wordIds } },
            select: { wordId: true, status: true },
          });
    const statusByWord = new Map(userWords.map((uw) => [uw.wordId, uw.status]));

    const rows = decks.map((deck) => {
      let newCount = 0;
      let learning = 0;
      let learned = 0;
      for (const w of deck.words) {
        const status = statusByWord.get(w.id);
        if (status === WordStatus.NEW) newCount += 1;
        else if (status === WordStatus.LEARNING) learning += 1;
        else if (status === WordStatus.LEARNED) learned += 1;
      }
      const total = newCount + learning + learned;

      return plainToInstance(
        DeckProgressDto,
        {
          id: deck.id,
          title: deck.title,
          level: deck.level,
          isSystem: deck.isSystem,
          total,
          new: newCount,
          learning,
          learned,
          progressPercentage:
            total > 0 ? Math.round((learned / total) * 100) : 0,
        },
        { excludeExtraneousValues: true },
      );
    });

    // System-first, then alphabetical — explicit so the order holds regardless
    // of the underlying store's orderBy support.
    return rows.sort((a, b) => {
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  }

  // The user's most troublesome words (high lapse count), worst first.
  async getLeeches(userId: string): Promise<LeechWordDto[]> {
    const rows = await this.prisma.userWord.findMany({
      where: { userId, lapses: { gte: LEECH_LAPSE_THRESHOLD } },
      orderBy: [{ lapses: 'desc' }, { lastReviewedAt: 'desc' }],
      take: 50,
      include: { word: { select: { word: true, translation: true } } },
    });

    return rows.map((uw) =>
      plainToInstance(
        LeechWordDto,
        {
          wordId: uw.wordId,
          word: uw.word.word,
          translation: uw.word.translation,
          lapses: uw.lapses,
          status: uw.status,
          lastReviewedAt: uw.lastReviewedAt,
        },
        { excludeExtraneousValues: true },
      ),
    );
  }
}
