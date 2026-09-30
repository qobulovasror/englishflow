import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { WordResponseDto } from './dto/word-response.dto';
import { WordQueryDto } from './dto/word-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate } from '../../common/utils/pagination.helper';
import { ImportPersonalWordsDto } from './dto/import-personal-words.dto';
import { ImportPersonalWordsResponseDto } from './dto/import-personal-words-response.dto';

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  private nonEmpty(value: string, field: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} must not be empty`);
    }
    return trimmed;
  }

  async create(dto: CreateWordDto, userId: string): Promise<WordResponseDto> {
    const wordText = this.nonEmpty(dto.word, 'Word');
    const translation = this.nonEmpty(dto.translation, 'Translation');
    // Both rows must land or neither — otherwise a failed userWord insert
    // leaves an orphan Word that isn't part of any learning list.
    const [word] = await this.prisma.$transaction(async (tx) => {
      const w = await tx.word.create({
        data: {
          word: wordText,
          translation,
          pronunciation: dto.pronunciation,
          partOfSpeech: dto.partOfSpeech,
          collocations: dto.collocations ?? [],
          example: dto.example,
          audioUrl: dto.audioUrl,
          createdById: userId,
        },
      });
      await tx.userWord.create({ data: { userId, wordId: w.id } });
      return [w];
    });

    return this.toDto(word);
  }

  async importPersonal(
    dto: ImportPersonalWordsDto,
    userId: string,
  ): Promise<ImportPersonalWordsResponseDto> {
    const rows = dto.words.map((word) => ({
      ...word,
      word: this.nonEmpty(word.word, 'Word'),
      translation: this.nonEmpty(word.translation, 'Translation'),
    }));
    const normalized = (word: string) =>
      word.normalize('NFKC').toLocaleLowerCase();
    const seen = new Set<string>();
    const uniqueRows = rows.filter((row) => {
      const key = normalized(row.word);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const duplicateCount = rows.length - uniqueRows.length;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // PostgreSQL case-insensitive matching does not equate canonically
        // equivalent Unicode spellings (for example NFC and NFD accents).
        // Normalize the user's existing vocabulary in the same way as input.
        const existing = await tx.word.findMany({
          where: { createdById: userId },
          select: { word: true },
        });
        const existingWords = new Set(
          existing.map((row) => normalized(row.word)),
        );
        const existingMatchCount = uniqueRows.filter((row) =>
          existingWords.has(normalized(row.word)),
        ).length;
        const toCreate = uniqueRows.filter(
          (row) => !existingWords.has(normalized(row.word)),
        );
        const created = toCreate.length
          ? await tx.word.createManyAndReturn({
              data: toCreate.map((row) => ({ ...row, createdById: userId })),
              select: { id: true },
            })
          : [];
        if (created.length) {
          await tx.userWord.createMany({
            data: created.map(({ id }) => ({ userId, wordId: id })),
            skipDuplicates: true,
          });
        }
        return {
          importedCount: created.length,
          duplicateCount: duplicateCount + existingMatchCount,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return plainToInstance(ImportPersonalWordsResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }

  async findAllByUser(
    userId: string,
    query: WordQueryDto,
  ): Promise<PaginatedResponseDto<WordResponseDto>> {
    const where = query.status
      ? {
          createdById: userId,
          userWords: { some: { userId, status: query.status } },
        }
      : { createdById: userId };
    const [words, total] = await this.prisma.$transaction([
      this.prisma.word.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.word.count({ where }),
    ]);

    return paginate(
      words.map((w) => this.toDto(w)),
      total,
      query,
    );
  }

  async update(
    id: string,
    dto: UpdateWordDto,
    userId: string,
  ): Promise<WordResponseDto> {
    const word = await this.prisma.word.findUnique({ where: { id } });

    if (!word) {
      throw new NotFoundException('Word not found');
    }

    if (word.createdById !== userId) {
      throw new ForbiddenException('You can only edit your own words');
    }

    const updated = await this.prisma.word.update({
      where: { id },
      data: {
        ...(dto.word !== undefined && {
          word: this.nonEmpty(dto.word, 'Word'),
        }),
        ...(dto.translation !== undefined && {
          translation: this.nonEmpty(dto.translation, 'Translation'),
        }),
        ...(dto.pronunciation !== undefined && {
          pronunciation: dto.pronunciation,
        }),
        ...(dto.partOfSpeech !== undefined && {
          partOfSpeech: dto.partOfSpeech,
        }),
        ...(dto.collocations !== undefined && {
          collocations: dto.collocations,
        }),
        ...(dto.example !== undefined && { example: dto.example }),
        ...(dto.audioUrl !== undefined && { audioUrl: dto.audioUrl }),
      },
    });

    return this.toDto(updated);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    for (let attempt = 0; ; attempt++) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            const word = await tx.word.findUnique({ where: { id } });
            if (!word) throw new NotFoundException('Word not found');
            if (word.createdById !== userId) {
              throw new ForbiddenException(
                'You can only delete your own words',
              );
            }

            const [progressCount, reviewCount, quizQuestionCount] =
              await Promise.all([
                tx.userWord.count({ where: { wordId: id } }),
                tx.review.count({ where: { wordId: id } }),
                tx.testQuestion.count({ where: { wordId: id } }),
              ]);
            if (
              word.deckId ||
              progressCount + reviewCount + quizQuestionCount > 0
            ) {
              // Preserve history and remove the word from its owner's collection.
              await tx.word.update({
                where: { id },
                data: { deckId: null, createdById: null },
              });
            } else {
              await tx.word.delete({ where: { id } });
            }
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        break;
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2034' || attempt >= 2) {
          throw error;
        }
      }
    }

    return { message: 'Word deleted successfully' };
  }

  private toDto(word: unknown): WordResponseDto {
    return plainToInstance(WordResponseDto, word, {
      excludeExtraneousValues: true,
    });
  }
}
