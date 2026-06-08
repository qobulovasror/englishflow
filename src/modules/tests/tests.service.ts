import { Injectable, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';
import { shuffle } from '../../common/utils/shuffle';
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

    const testWords = shuffle(words).slice(0, this.TEST_QUESTION_COUNT);

    const questions = testWords.map((word) => {
      const otherWords = words.filter((w) => w.id !== word.id);
      const wrongAnswers = shuffle(otherWords)
        .slice(0, 3)
        .map((w) => w.translation);

      const options = shuffle([word.translation, ...wrongAnswers]);

      // NOTE: `correctAnswer` is deliberately NOT included here. Returning it
      // would let the client read the answer key from DevTools. The server is
      // the only source of truth for grading — see `submitTest` below.
      return {
        wordId: word.id,
        word: word.word,
        options,
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
    // Single bulk query (was N+1 in the loop) AND scope it to words owned by
    // this user — otherwise a caller could submit another user's wordId and
    // have it graded against that user's vocabulary.
    const wordIds = dto.answers.map((a) => a.wordId);
    const words = await this.prisma.word.findMany({
      where: { id: { in: wordIds }, createdById: userId },
    });
    const byId = new Map(words.map((w) => [w.id, w]));

    let score = 0;
    const questionsData: Array<{
      wordId: string;
      selectedAnswer: string;
      correctAnswer: string;
    }> = [];

    for (const answer of dto.answers) {
      const word = byId.get(answer.wordId);
      if (!word) continue; // unknown or not owned — skipped silently

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
