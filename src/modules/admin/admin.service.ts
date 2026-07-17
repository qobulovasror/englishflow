import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/utils/pagination.helper';
import { bucketByDay } from '../../common/utils/trend';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { UpdateWordDto } from '../words/dto/update-word.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminUserResponseDto } from './dto/admin-user-response.dto';
import { AdminWordQueryDto } from './dto/admin-word-query.dto';
import { AdminWordResponseDto } from './dto/admin-word-response.dto';
import { CreateAdminWordDto } from './dto/create-admin-word.dto';
import { ImportWordsDto } from './dto/import-words.dto';
import { ImportWordsResultDto } from './dto/import-words-response.dto';
import {
  AdminStatsOverviewDto,
  SignupPointDto,
} from './dto/admin-stats-response.dto';

const USER_COUNT_SELECT = {
  words: true,
  decks: true,
  enrollments: true,
  reviews: true,
  tests: true,
} as const;

type UserWithCounts = Prisma.UserGetPayload<{
  include: { _count: { select: typeof USER_COUNT_SELECT } };
}>;

type WordWithRefs = Prisma.WordGetPayload<{
  include: {
    deck: { select: { title: true } };
    createdBy: { select: { email: true } };
  };
}>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Start of the current UTC day (midnight). */
function startOfUtcToday(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Backs every `/admin/*` endpoint except deck management (which reuses
 * DecksService). Talks to Prisma directly and always maps rows through a
 * response DTO so the password hash never leaves this layer.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Dashboard / stats ─────────────────────────────────────────────────────

  async overview(): Promise<AdminStatsOverviewDto> {
    const todayStart = startOfUtcToday();
    const weekAgo = new Date(Date.now() - 7 * MS_PER_DAY);

    const [
      totalUsers,
      admins,
      verified,
      onboarded,
      newToday,
      newThisWeek,
      totalDecks,
      systemDecks,
      totalWords,
      totalReviews,
      reviewsToday,
      totalTests,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      this.prisma.user.count({ where: { onboardedAt: { not: null } } }),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.deck.count(),
      this.prisma.deck.count({ where: { isSystem: true } }),
      this.prisma.word.count(),
      this.prisma.review.count(),
      this.prisma.review.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.test.count(),
    ]);

    return plainToInstance(
      AdminStatsOverviewDto,
      {
        users: {
          total: totalUsers,
          admins,
          verified,
          onboarded,
          newToday,
          newThisWeek,
        },
        decks: { total: totalDecks, system: systemDecks },
        words: { total: totalWords },
        reviews: { total: totalReviews, today: reviewsToday },
        tests: { total: totalTests },
      },
      { excludeExtraneousValues: true },
    );
  }

  async signups(days = 30): Promise<SignupPointDto[]> {
    const window = Math.min(Math.max(days, 1), 365);
    const since = startOfUtcToday(
      new Date(Date.now() - (window - 1) * MS_PER_DAY),
    );

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });

    const todayUtc = new Date().toISOString().slice(0, 10);
    const series = bucketByDay(
      users.map((u) => u.createdAt),
      todayUtc,
      window,
    );
    return plainToInstance(SignupPointDto, series, {
      excludeExtraneousValues: true,
    });
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async listUsers(
    query: AdminUserQueryDto,
  ): Promise<PaginatedResponseDto<AdminUserResponseDto>> {
    const where: Prisma.UserWhereInput = {
      AND: [
        query.search
          ? { email: { contains: query.search, mode: 'insensitive' } }
          : {},
        query.role ? { role: query.role } : {},
      ],
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: USER_COUNT_SELECT } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      users.map((u) => this.toUserDto(u)),
      total,
      query,
    );
  }

  async getUser(id: string): Promise<AdminUserResponseDto> {
    const user = await this.loadUserWithCounts(id);
    return this.toUserDto(user);
  }

  async changeRole(
    id: string,
    role: Role,
    actingUserId: string,
  ): Promise<AdminUserResponseDto> {
    if (id === actingUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    // Guard + mutation run in one serializable transaction: two concurrent
    // demotions must not both pass the last-admin check and drop the platform
    // to zero admins (which would lock everyone out of /admin).
    const updated = await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        if (user.role === Role.ADMIN && role !== Role.ADMIN) {
          await this.assertNotLastAdmin(tx);
        }

        return tx.user.update({
          where: { id },
          data: { role },
          include: { _count: { select: USER_COUNT_SELECT } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.toUserDto(updated);
  }

  /** Idempotently marks the user's email as verified. */
  async verifyUserEmail(id: string): Promise<AdminUserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
      include: { _count: { select: USER_COUNT_SELECT } },
    });
    return this.toUserDto(updated);
  }

  async deleteUser(
    id: string,
    actingUserId: string,
  ): Promise<{ message: string }> {
    if (id === actingUserId) {
      throw new BadRequestException(
        'You cannot delete your own account from the admin panel',
      );
    }

    // Guard + delete in one serializable transaction — see `changeRole`.
    await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        if (user.role === Role.ADMIN) {
          await this.assertNotLastAdmin(tx);
        }

        // Cascade relations remove all owned rows (words, progress, tokens…).
        await tx.user.delete({ where: { id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return { message: 'User deleted' };
  }

  // ── Words ───────────────────────────────────────────────────────────────────

  async listWords(
    query: AdminWordQueryDto,
  ): Promise<PaginatedResponseDto<AdminWordResponseDto>> {
    const where: Prisma.WordWhereInput = {
      AND: [
        query.search
          ? {
              OR: [
                { word: { contains: query.search, mode: 'insensitive' } },
                {
                  translation: { contains: query.search, mode: 'insensitive' },
                },
              ],
            }
          : {},
        query.deckId ? { deckId: query.deckId } : {},
      ],
    };

    const [words, total] = await this.prisma.$transaction([
      this.prisma.word.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          deck: { select: { title: true } },
          createdBy: { select: { email: true } },
        },
      }),
      this.prisma.word.count({ where }),
    ]);

    return paginate(
      words.map((w) => this.toWordDto(w)),
      total,
      query,
    );
  }

  /** Creates a curated word (no owner). Attaches to a deck when `deckId` is given. */
  async createWord(dto: CreateAdminWordDto): Promise<AdminWordResponseDto> {
    if (dto.deckId) {
      const deck = await this.prisma.deck.findUnique({
        where: { id: dto.deckId },
      });
      if (!deck) throw new NotFoundException('Deck not found');
    }

    const word = await this.prisma.word.create({
      data: {
        word: dto.word,
        translation: dto.translation,
        example: dto.example,
        audioUrl: dto.audioUrl,
        deckId: dto.deckId ?? null,
        createdById: null,
      },
      include: {
        deck: { select: { title: true } },
        createdBy: { select: { email: true } },
      },
    });
    return this.toWordDto(word);
  }

  /** Edits ANY word, bypassing the per-user ownership check. */
  async updateWord(
    id: string,
    dto: UpdateWordDto,
  ): Promise<AdminWordResponseDto> {
    const existing = await this.prisma.word.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Word not found');

    const word = await this.prisma.word.update({
      where: { id },
      data: {
        ...(dto.word !== undefined && { word: dto.word }),
        ...(dto.translation !== undefined && { translation: dto.translation }),
        ...(dto.example !== undefined && { example: dto.example }),
        ...(dto.audioUrl !== undefined && { audioUrl: dto.audioUrl }),
      },
      include: {
        deck: { select: { title: true } },
        createdBy: { select: { email: true } },
      },
    });
    return this.toWordDto(word);
  }

  async deleteWord(id: string): Promise<{ message: string }> {
    const existing = await this.prisma.word.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Word not found');

    await this.prisma.word.delete({ where: { id } });
    return { message: 'Word deleted' };
  }

  /**
   * Bulk-imports parsed rows (from a CSV/JSON upload). Rows that duplicate an
   * existing word in the same scope — same deck, matched case-insensitively on
   * word+translation — are skipped, as are duplicates within the batch itself.
   * Returns how many were inserted vs skipped so the UI can report the outcome.
   */
  async importWords(dto: ImportWordsDto): Promise<ImportWordsResultDto> {
    const deckId = dto.deckId ?? null;

    if (deckId) {
      const deck = await this.prisma.deck.findUnique({ where: { id: deckId } });
      if (!deck) throw new NotFoundException('Deck not found');
    }

    // 1) Collapse duplicates inside the incoming batch (case-insensitive).
    const seen = new Set<string>();
    const batchUnique = dto.words.filter((w) => {
      const key = this.wordKey(w.word, w.translation);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 2) Skip rows already present in the same scope. The DB filter matches the
    //    batch words case-INSENSITIVELY (bounded by the batch size) so the final
    //    wordKey comparison — which lower-cases word+translation — reliably
    //    catches cross-case re-imports like "Apple"/"apple".
    const existing =
      batchUnique.length === 0
        ? []
        : await this.prisma.word.findMany({
            where: {
              deckId,
              OR: batchUnique.map((w) => ({
                word: { equals: w.word, mode: 'insensitive' as const },
              })),
            },
            select: { word: true, translation: true },
          });
    const existingKeys = new Set(
      existing.map((e) => this.wordKey(e.word, e.translation)),
    );
    const toInsert = batchUnique.filter(
      (w) => !existingKeys.has(this.wordKey(w.word, w.translation)),
    );

    if (toInsert.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.word.createManyAndReturn({
          data: toInsert.map((w) => ({
            word: w.word,
            translation: w.translation,
            example: w.example,
            audioUrl: w.audioUrl,
            deckId,
            createdById: null,
          })),
          select: { id: true },
        });

        // Back-fill UserWord for anyone already enrolled in the target deck, so
        // the just-imported words reach their learning list. Crossing only the
        // new words against enrollees bounds the insert to the delta;
        // skipDuplicates keeps it idempotent.
        if (deckId) {
          const enrollments = await tx.deckEnrollment.findMany({
            where: { deckId },
            select: { userId: true },
          });
          if (enrollments.length > 0) {
            await tx.userWord.createMany({
              data: enrollments.flatMap((e) =>
                created.map((w) => ({ userId: e.userId, wordId: w.id })),
              ),
              skipDuplicates: true,
            });
          }
        }
      });
    }

    const imported = toInsert.length;
    const skipped = dto.words.length - imported;
    return plainToInstance(
      ImportWordsResultDto,
      {
        message: `Imported ${imported} word${imported === 1 ? '' : 's'}, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}`,
        received: dto.words.length,
        imported,
        skipped,
      },
      { excludeExtraneousValues: true },
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Case-insensitive dedup key for a word: `word\0translation`, trimmed+lowercased. */
  private wordKey(word: string, translation: string): string {
    return `${word.trim().toLowerCase()}\u0000${translation.trim().toLowerCase()}`;
  }

  private async loadUserWithCounts(id: string): Promise<UserWithCounts> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { _count: { select: USER_COUNT_SELECT } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async assertNotLastAdmin(
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const admins = await tx.user.count({ where: { role: Role.ADMIN } });
    if (admins <= 1) {
      throw new BadRequestException('Cannot remove the last remaining admin');
    }
  }

  private toUserDto(user: UserWithCounts): AdminUserResponseDto {
    return plainToInstance(
      AdminUserResponseDto,
      {
        id: user.id,
        email: user.email,
        role: user.role,
        level: user.level,
        dailyGoal: user.dailyGoal,
        onboardedAt: user.onboardedAt,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        counts: {
          words: user._count.words,
          decks: user._count.decks,
          enrollments: user._count.enrollments,
          reviews: user._count.reviews,
          tests: user._count.tests,
        },
      },
      { excludeExtraneousValues: true },
    );
  }

  private toWordDto(word: WordWithRefs): AdminWordResponseDto {
    return plainToInstance(
      AdminWordResponseDto,
      {
        id: word.id,
        word: word.word,
        translation: word.translation,
        example: word.example,
        audioUrl: word.audioUrl,
        deckId: word.deckId,
        deckTitle: word.deck?.title ?? null,
        createdById: word.createdById,
        ownerEmail: word.createdBy?.email ?? null,
        isSystem: word.createdById === null,
        createdAt: word.createdAt,
        updatedAt: word.updatedAt,
      },
      { excludeExtraneousValues: true },
    );
  }
}
