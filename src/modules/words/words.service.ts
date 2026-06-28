import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { WordResponseDto } from './dto/word-response.dto';
import { WordQueryDto } from './dto/word-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate } from '../../common/utils/pagination.helper';

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWordDto, userId: string): Promise<WordResponseDto> {
    // Both rows must land or neither — otherwise a failed userWord insert
    // leaves an orphan Word that isn't part of any learning list.
    const [word] = await this.prisma.$transaction(async (tx) => {
      const w = await tx.word.create({
        data: {
          word: dto.word,
          translation: dto.translation,
          example: dto.example,
          createdById: userId,
        },
      });
      await tx.userWord.create({ data: { userId, wordId: w.id } });
      return [w];
    });

    return this.toDto(word);
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
        ...(dto.word !== undefined && { word: dto.word }),
        ...(dto.translation !== undefined && { translation: dto.translation }),
        ...(dto.example !== undefined && { example: dto.example }),
      },
    });

    return this.toDto(updated);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const word = await this.prisma.word.findUnique({ where: { id } });

    if (!word) {
      throw new NotFoundException('Word not found');
    }

    if (word.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own words');
    }

    await this.prisma.word.delete({ where: { id } });

    return { message: 'Word deleted successfully' };
  }

  async getRandomWordsForUser(userId: string, count: number) {
    return this.prisma.word.findMany({
      where: { createdById: userId },
      take: count,
      orderBy: { createdAt: 'asc' },
    });
  }

  private toDto(word: unknown): WordResponseDto {
    return plainToInstance(WordResponseDto, word, {
      excludeExtraneousValues: true,
    });
  }
}
