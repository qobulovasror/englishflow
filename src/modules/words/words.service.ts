import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWordDto } from './dto/create-word.dto';
import { WordResponseDto } from './dto/word-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate } from '../../common/utils/pagination.helper';

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWordDto, userId: string): Promise<WordResponseDto> {
    const word = await this.prisma.word.create({
      data: {
        word: dto.word,
        translation: dto.translation,
        example: dto.example,
        createdById: userId,
      },
    });

    await this.prisma.userWord.create({
      data: {
        userId,
        wordId: word.id,
      },
    });

    return this.toDto(word);
  }

  async findAllByUser(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WordResponseDto>> {
    const where = { createdById: userId };
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
