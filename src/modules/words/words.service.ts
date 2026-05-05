import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWordDto } from './dto/create-word.dto';

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWordDto, userId: string) {
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

    return word;
  }

  async findAllByUser(userId: string) {
    return this.prisma.word.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, userId: string) {
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
}
