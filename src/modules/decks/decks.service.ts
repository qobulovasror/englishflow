import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Deck, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WordResponseDto } from '../words/dto/word-response.dto';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { AddDeckWordsDto } from './dto/add-deck-words.dto';
import { DeckQueryDto } from './dto/deck-query.dto';
import {
  DeckResponseDto,
  DeckDetailResponseDto,
  EnrollResponseDto,
  AddDeckWordsResponseDto,
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

  async create(dto: CreateDeckDto, userId: string): Promise<DeckResponseDto> {
    const deck = await this.prisma.deck.create({
      data: {
        title: dto.title,
        description: dto.description,
        level: dto.level,
        isPublic: dto.isPublic ?? false,
        isSystem: false,
        createdById: userId,
      },
    });

    // A freshly created deck has no words and the owner hasn't "enrolled" — it's
    // theirs to edit, not a learning list they joined.
    return this.toDto({ ...deck, _count: { words: 0 } }, false);
  }

  async update(
    id: string,
    dto: UpdateDeckDto,
    userId: string,
  ): Promise<DeckResponseDto> {
    await this.loadOwnedDeck(id, userId);

    const deck = await this.prisma.deck.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
      include: { _count: { select: { words: true } } },
    });

    const isEnrolled = await this.isEnrolled(userId, id);
    return this.toDto(deck, isEnrolled);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.loadOwnedDeck(id, userId);

    // Cascades remove the deck's words (and their UserWord/testQuestion rows)
    // plus any enrollments via the schema's onDelete: Cascade relations.
    await this.prisma.deck.delete({ where: { id } });

    return { message: 'Deck deleted successfully' };
  }

  async addWords(
    id: string,
    dto: AddDeckWordsDto,
    userId: string,
  ): Promise<AddDeckWordsResponseDto> {
    const deck = await this.loadOwnedDeck(id, userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.word.createMany({
        data: dto.words.map((w) => ({
          word: w.word,
          translation: w.translation,
          example: w.example,
          audioUrl: w.audioUrl,
          deckId: id,
          createdById: userId,
        })),
      });
    });

    const wordCount = await this.prisma.word.count({ where: { deckId: id } });

    return plainToInstance(
      AddDeckWordsResponseDto,
      {
        message: `Added ${dto.words.length} words to "${deck.title}"`,
        addedCount: dto.words.length,
        wordCount,
      },
      { excludeExtraneousValues: true },
    );
  }

  async removeWord(
    id: string,
    wordId: string,
    userId: string,
  ): Promise<{ message: string }> {
    await this.loadOwnedDeck(id, userId);

    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word || word.deckId !== id) {
      throw new NotFoundException('Word not found in this deck');
    }

    // Cascades remove the word's UserWord and testQuestion rows.
    await this.prisma.word.delete({ where: { id: wordId } });

    return { message: 'Word removed from deck' };
  }

  // --- Admin scope ---------------------------------------------------------
  // These methods back the /admin/decks endpoints (RolesGuard + @Roles(ADMIN)).
  // They deliberately skip the per-user ownership checks above: an admin curates
  // shared/system content, so access is gated by role at the controller layer.

  /** Creates a curated SYSTEM deck (no individual owner, visible to everyone). */
  async adminCreate(dto: CreateDeckDto): Promise<DeckResponseDto> {
    const deck = await this.prisma.deck.create({
      data: {
        title: dto.title,
        description: dto.description,
        level: dto.level,
        isPublic: true,
        isSystem: true,
        createdById: null,
      },
    });

    return this.toDto({ ...deck, _count: { words: 0 } }, false);
  }

  /** Adds words to ANY deck, bypassing the owner check. */
  async adminAddWords(
    id: string,
    dto: AddDeckWordsDto,
  ): Promise<AddDeckWordsResponseDto> {
    const deck = await this.prisma.deck.findUnique({ where: { id } });
    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.word.createMany({
        data: dto.words.map((w) => ({
          word: w.word,
          translation: w.translation,
          example: w.example,
          audioUrl: w.audioUrl,
          deckId: id,
          createdById: null,
        })),
      });
    });

    const wordCount = await this.prisma.word.count({ where: { deckId: id } });

    return plainToInstance(
      AddDeckWordsResponseDto,
      {
        message: `Added ${dto.words.length} words to "${deck.title}"`,
        addedCount: dto.words.length,
        wordCount,
      },
      { excludeExtraneousValues: true },
    );
  }

  /** Deletes ANY deck. Cascades remove its words and enrollments. */
  async adminRemove(id: string): Promise<{ message: string }> {
    const deck = await this.prisma.deck.findUnique({ where: { id } });
    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    await this.prisma.deck.delete({ where: { id } });

    return { message: 'Deck deleted successfully' };
  }

  // Loads a deck the user is allowed to mutate. The same 404/403 guard backs
  // every write path so the ownership rule lives in one place: system decks and
  // other users' decks are off-limits.
  private async loadOwnedDeck(id: string, userId: string): Promise<Deck> {
    const deck = await this.prisma.deck.findUnique({ where: { id } });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    if (deck.isSystem || deck.createdById !== userId) {
      throw new ForbiddenException('You can only edit your own decks');
    }

    return deck;
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
