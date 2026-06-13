import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

    // Persist the test as a server-owned challenge: which words were asked and
    // their correct answers are committed now, before the client sees anything.
    // Grading later reads from these rows, so the client cannot change the
    // question set or the answer key — it can only report which option it
    // picked. `selectedAnswer` stays null until submit.
    const test = await this.prisma.test.create({
      data: {
        userId,
        questions: {
          create: testWords.map((word) => ({
            wordId: word.id,
            correctAnswer: word.translation,
          })),
        },
      },
    });

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
      { testId: test.id, questions },
      { excludeExtraneousValues: true },
    );
  }

  async submitTest(
    dto: SubmitTestDto,
    userId: string,
  ): Promise<SubmitTestResponseDto> {
    // Load the server-owned challenge. Scoping to userId means a caller can't
    // grade someone else's test, and `submittedAt` enforces submit-once so a
    // score can't be replayed or rewritten.
    const test = await this.prisma.test.findFirst({
      where: { id: dto.testId, userId },
      include: { questions: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }
    if (test.submittedAt) {
      throw new BadRequestException('This test has already been submitted');
    }

    // The client's picks, keyed by wordId. Answers for words that aren't part
    // of this test are ignored; questions with no answer count as unanswered.
    const selectedByWordId = new Map(
      dto.answers.map((a) => [a.wordId, a.selectedAnswer]),
    );

    let score = 0;
    const graded = test.questions.map((q) => {
      const selectedAnswer = selectedByWordId.get(q.wordId) ?? null;
      const isCorrect =
        selectedAnswer !== null && selectedAnswer === q.correctAnswer;
      if (isCorrect) score++;
      return { id: q.id, wordId: q.wordId, selectedAnswer, correctAnswer: q.correctAnswer };
    });

    // Persist the picks and the final score atomically, stamping submittedAt so
    // the test can never be graded twice.
    await this.prisma.$transaction([
      ...graded.map((g) =>
        this.prisma.testQuestion.update({
          where: { id: g.id },
          data: { selectedAnswer: g.selectedAnswer },
        }),
      ),
      this.prisma.test.update({
        where: { id: test.id },
        data: { score, submittedAt: new Date() },
      }),
    ]);

    const total = test.questions.length;

    return plainToInstance(
      SubmitTestResponseDto,
      {
        testId: test.id,
        score,
        total,
        percentage: total > 0 ? Math.round((score / total) * 100) : 0,
        questions: graded,
      },
      { excludeExtraneousValues: true },
    );
  }
}
