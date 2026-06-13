import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WordResponseDto } from '../words/dto/word-response.dto';
import { DeckQueryDto } from './dto/deck-query.dto';
import {
  DeckResponseDto,
  DeckDetailResponseDto,
  EnrollResponseDto,
} from './dto/deck-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate } from '../../common/utils/pagination.helper';

@Injectable()
export class DecksService {
  constructor(private readonly prisma: PrismaService) {}

  // A deck is visible to a user if it's a curated system deck, a public deck,
  // or one the user created themselves. Reused by every read/enroll path so the
  // access rule lives in exactly one place.
  private visibleWhere(userId: string): Prisma.DeckWhereInput {
    return {
      OR: [{ isSystem: true }, { isPublic: true }, { createdById: userId }],
    };
  }

  async findAll(
    userId: string,
    query: DeckQueryDto,
  ): Promise<PaginatedResponseDto<DeckResponseDto>> {
    const where: Prisma.DeckWhereInput = {
      AND: [
        this.visibleWhere(userId),
        query.level ? { level: query.level } : {},
        query.search
          ? { title: { contains: query.search, mode: 'insensitive' } }
          : {},
      ],
    };

    const [decks, total] = await this.prisma.$transaction([
      this.prisma.deck.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: [{ isSystem: 'desc' }, { level: 'asc' }, { title: 'asc' }],
        include: { _count: { select: { words: true } } },
      }),
      this.prisma.deck.count({ where }),
    ]);

    const enrolledIds = await this.enrolledDeckIds(
      userId,
      decks.map((d) => d.id),
    );

    return paginate(
      decks.map((d) => this.toDto(d, enrolledIds.has(d.id))),
      total,
      query,
    );
  }

  async findMine(userId: string): Promise<DeckResponseDto[]> {
    const decks = await this.prisma.deck.findMany({
      where: {
        OR: [
          { enrollments: { some: { userId } } },
          { createdById: userId },
        ],
      },
      orderBy: [{ isSystem: 'desc' }, { title: 'asc' }],
      include: { _count: { select: { words: true } } },
    });

    const enrolledIds = await this.enrolledDeckIds(
      userId,
      decks.map((d) => d.id),
    );

    return decks.map((d) => this.toDto(d, enrolledIds.has(d.id)));
  }

  async findOne(id: string, userId: string): Promise<DeckDetailResponseDto> {
    const deck = await this.prisma.deck.findFirst({
      where: { AND: [{ id }, this.visibleWhere(userId)] },
      include: {
        words: { orderBy: { createdAt: 'asc' } },
        _count: { select: { words: true } },
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const isEnrolled = await this.isEnrolled(userId, id);

    return plainToInstance(
      DeckDetailResponseDto,
      {
        ...this.plainDeck(deck, isEnrolled),
        words: deck.words.map((w) =>
          plainToInstance(WordResponseDto, w, {
            excludeExtraneousValues: true,
          }),
        ),
      },
      { excludeExtraneousValues: true },
    );
  }

  async enroll(id: string, userId: string): Promise<EnrollResponseDto> {
    const deck = await this.prisma.deck.findFirst({
      where: { AND: [{ id }, this.visibleWhere(userId)] },
      include: { words: { select: { id: true } } },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const wordIds = deck.words.map((w) => w.id);

    // createMany with skipDuplicates means re-enrolling (or overlapping decks)
    // never errors on the @@unique([userId, wordId]) and never resets progress
    // on words the user is already learning. The enrollment row is upserted so
    // the deck shows up in "my decks" exactly once.
    await this.prisma.$transaction([
      this.prisma.userWord.createMany({
        data: wordIds.map((wordId) => ({ userId, wordId })),
        skipDuplicates: true,
      }),
      this.prisma.deckEnrollment.upsert({
        where: { userId_deckId: { userId, deckId: id } },
        create: { userId, deckId: id },
        update: {},
      }),
    ]);

    return plainToInstance(
      EnrollResponseDto,
      {
        message: `Enrolled in "${deck.title}"`,
        enrolledCount: wordIds.length,
      },
      { excludeExtraneousValues: true },
    );
  }

  private async enrolledDeckIds(
    userId: string,
    deckIds: string[],
  ): Promise<Set<string>> {
    if (deckIds.length === 0) return new Set();
    const rows = await this.prisma.deckEnrollment.findMany({
      where: { userId, deckId: { in: deckIds } },
      select: { deckId: true },
    });
    return new Set(rows.map((r) => r.deckId));
  }

  private async isEnrolled(userId: string, deckId: string): Promise<boolean> {
    const row = await this.prisma.deckEnrollment.findUnique({
      where: { userId_deckId: { userId, deckId } },
      select: { id: true },
    });
    return row !== null;
  }

  private plainDeck(
    deck: { _count?: { words: number } } & Record<string, unknown>,
    isEnrolled: boolean,
  ) {
    return {
      id: deck.id,
      title: deck.title,
      description: deck.description,
      level: deck.level,
      isSystem: deck.isSystem,
      wordCount: deck._count?.words ?? 0,
      isEnrolled,
      createdAt: deck.createdAt,
    };
  }

  private toDto(
    deck: { _count?: { words: number } } & Record<string, unknown>,
    isEnrolled: boolean,
  ): DeckResponseDto {
    return plainToInstance(DeckResponseDto, this.plainDeck(deck, isEnrolled), {
      excludeExtraneousValues: true,
    });
  }
}
