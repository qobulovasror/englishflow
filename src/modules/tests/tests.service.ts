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
    // Draw from the user's learning list (UserWord), not words they authored —
    // so words added by enrolling in a deck are testable too. Fetch just the ids
    // (cheap), then randomly sample a pool: without random sampling Postgres
    // returns the same earliest rows every time, so a user with hundreds of
    // words would be quizzed forever on their first ~10. We pull a wider pool
    // than we need so the wrong-answer distractors have variety.
    const wordRefs = await this.prisma.userWord.findMany({
      where: { userId },
      select: { wordId: true },
    });

    if (wordRefs.length < this.TEST_QUESTION_COUNT) {
      throw new BadRequestException(
        `You need at least ${this.TEST_QUESTION_COUNT} words to start a test`,
      );
    }

    const pooledIds = shuffle(wordRefs.map((r) => r.wordId)).slice(
      0,
      this.TEST_QUESTION_COUNT * 2,
    );
    const words = await this.prisma.word.findMany({
      where: { id: { in: pooledIds } },
    });

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
      return {
        id: q.id,
        wordId: q.wordId,
        selectedAnswer,
        correctAnswer: q.correctAnswer,
      };
    });

    // Persist the picks and the final score atomically. The submit-once guard
    // must be atomic: the early `test.submittedAt` check above is only a fast
    // path — two concurrent submits could both pass it. Claiming the row with a
    // conditional `updateMany (submittedAt: null)` lets exactly one win; the
    // loser sees count 0 and is rejected before any question rows are written.
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.test.updateMany({
        where: { id: test.id, userId, submittedAt: null },
        data: { score, submittedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('This test has already been submitted');
      }
      await Promise.all(
        graded.map((g) =>
          tx.testQuestion.update({
            where: { id: g.id },
            data: { selectedAnswer: g.selectedAnswer },
          }),
        ),
      );
    });

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
