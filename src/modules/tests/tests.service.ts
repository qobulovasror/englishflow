import { Injectable, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitTestDto } from './dto/submit-test.dto';
import {
  StartTestResponseDto,
  SubmitTestResponseDto,
} from './dto/test-response.dto';

@Injectable()
export class TestsService {
  private readonly TEST_QUESTION_COUNT = 5;

  constructor(private readonly prisma: PrismaService) {}

  async startTest(userId: string): Promise<StartTestResponseDto> {
    const words = await this.prisma.word.findMany({
      where: { createdById: userId },
      take: this.TEST_QUESTION_COUNT * 2,
    });

    if (words.length < this.TEST_QUESTION_COUNT) {
      throw new BadRequestException(
        `You need at least ${this.TEST_QUESTION_COUNT} words to start a test`,
      );
    }

    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const testWords = shuffled.slice(0, this.TEST_QUESTION_COUNT);

    const questions = testWords.map((word) => {
      const otherWords = words.filter((w) => w.id !== word.id);
      const wrongAnswers = otherWords
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.translation);

      const options = [word.translation, ...wrongAnswers].sort(
        () => Math.random() - 0.5,
      );

      return {
        wordId: word.id,
        word: word.word,
        options,
        correctAnswer: word.translation,
      };
    });

    return plainToInstance(
      StartTestResponseDto,
      { questions },
      { excludeExtraneousValues: true },
    );
  }

  async submitTest(
    dto: SubmitTestDto,
    userId: string,
  ): Promise<SubmitTestResponseDto> {
    let score = 0;
    const questionsData = [];

    for (const answer of dto.answers) {
      const word = await this.prisma.word.findUnique({
        where: { id: answer.wordId },
      });

      if (!word) continue;

      const isCorrect = answer.selectedAnswer === word.translation;
      if (isCorrect) score++;

      questionsData.push({
        wordId: answer.wordId,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: word.translation,
      });
    }

    const test = await this.prisma.test.create({
      data: {
        userId,
        score,
        questions: {
          create: questionsData,
        },
      },
      include: { questions: true },
    });

    return plainToInstance(
      SubmitTestResponseDto,
      {
        testId: test.id,
        score,
        total: dto.answers.length,
        percentage: Math.round((score / dto.answers.length) * 100),
        questions: test.questions,
      },
      { excludeExtraneousValues: true },
    );
  }
}
