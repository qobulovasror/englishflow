import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { QuizMode } from '@prisma/client';
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

  async startTest(
    userId: string,
    mode: QuizMode = QuizMode.FORWARD,
  ): Promise<StartTestResponseDto> {
    // Draw from the user's learning list (UserWord), not words they authored —
    // so words added by enrolling in a deck are testable too. Fetch just the ids
    // (cheap), then randomly sample a pool: without random sampling Postgres
    // returns the same earliest rows every time, so a user with hundreds of
    // words would be quizzed forever on their first ~10. We pull a wider pool
    // than we need so the wrong-answer distractors have variety.
    const wordRefs = await this.loadQuizWordRefs(userId, mode);

    if (wordRefs.length < this.TEST_QUESTION_COUNT) {
      throw new BadRequestException(
        `You need at least ${this.TEST_QUESTION_COUNT} words to start a test`,
      );
    }

    const orderedIds = wordRefs.map((r) => r.wordId);
    const targetedMode =
      mode === QuizMode.MISTAKES || mode === QuizMode.DIFFICULT;
    const candidateIds =
      targetedMode || mode === QuizMode.CLOZE || mode === QuizMode.LISTENING
        ? orderedIds
        : shuffle(orderedIds).slice(0, 100);
    const words = await this.loadWordPool(candidateIds, mode);

    const eligibleWords =
      mode === QuizMode.CLOZE
        ? words.filter(
            (w) => w.example && this.findWholeWordIndex(w.example, w.word) >= 0,
          )
        : mode === QuizMode.LISTENING
          ? words.filter((w) => !!w.audioUrl)
          : words;
    if (eligibleWords.length < this.TEST_QUESTION_COUNT) {
      throw new BadRequestException(
        mode === QuizMode.CLOZE
          ? 'Not enough words with matching example sentences. Add more examples or choose another mode.'
          : 'Not enough words with audio. Add audio clips or choose another mode.',
      );
    }
    const testWords = (
      targetedMode ? eligibleWords : shuffle(eligibleWords)
    ).slice(0, this.TEST_QUESTION_COUNT);

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
            correctAnswer:
              mode === QuizMode.REVERSE || mode === QuizMode.CLOZE
                ? word.word
                : word.translation,
            mode,
          })),
        },
      },
    });

    const questions = testWords.map((word) => {
      const otherWords = words.filter((w) => w.id !== word.id);
      const prompt =
        mode === QuizMode.REVERSE
          ? word.translation
          : mode === QuizMode.CLOZE
            ? this.clozePrompt(word.example ?? '', word.word)
            : mode === QuizMode.LISTENING
              ? 'Listen and choose the meaning'
              : word.word;
      const answer =
        mode === QuizMode.REVERSE || mode === QuizMode.CLOZE
          ? word.word
          : word.translation;
      const wrongAnswers = shuffle(otherWords)
        .slice(0, 3)
        .map((w) =>
          mode === QuizMode.REVERSE || mode === QuizMode.CLOZE
            ? w.word
            : w.translation,
        );

      const options =
        mode === QuizMode.TYPED ? [] : shuffle([answer, ...wrongAnswers]);

      // NOTE: `correctAnswer` is deliberately NOT included here. Returning it
      // would let the client read the answer key from DevTools. The server is
      // the only source of truth for grading — see `submitTest` below.
      return {
        wordId: word.id,
        word: mode === QuizMode.LISTENING ? '' : prompt,
        prompt,
        mode,
        audioUrl: word.audioUrl,
        options,
      };
    });

    return plainToInstance(
      StartTestResponseDto,
      { testId: test.id, questions },
      { excludeExtraneousValues: true },
    );
  }

  private async loadWordPool(wordIds: string[], mode: QuizMode) {
    const scanAll = mode === QuizMode.CLOZE || mode === QuizMode.LISTENING;
    const idsToScan = scanAll ? wordIds : wordIds.slice(0, 100);
    const pool: Awaited<ReturnType<PrismaService['word']['findMany']>> = [];
    const chunkSize = 100;
    for (let start = 0; start < idsToScan.length; start += chunkSize) {
      const ids = idsToScan.slice(start, start + chunkSize);
      const where: Prisma.WordWhereInput = { id: { in: ids } };
      if (mode === QuizMode.CLOZE) where.example = { not: null };
      if (mode === QuizMode.LISTENING) where.audioUrl = { not: null };
      const chunk = await this.prisma.word.findMany({ where });
      const byId = new Map(chunk.map((word) => [word.id, word]));
      const orderedChunk = ids.flatMap((id) => {
        const word = byId.get(id);
        return word ? [word] : [];
      });
      const eligibleChunk =
        mode === QuizMode.CLOZE
          ? orderedChunk.filter(
              (word) =>
                word.example &&
                this.findWholeWordIndex(word.example, word.word) >= 0,
            )
          : mode === QuizMode.LISTENING
            ? orderedChunk.filter((word) => !!word.audioUrl)
            : orderedChunk;
      pool.push(...eligibleChunk);
      if (pool.length >= this.TEST_QUESTION_COUNT * 4) break;
    }
    return pool;
  }

  private async loadQuizWordRefs(userId: string, mode: QuizMode) {
    if (mode !== QuizMode.MISTAKES && mode !== QuizMode.DIFFICULT) {
      return this.prisma.userWord.findMany({
        where: { userId },
        select: { wordId: true },
      });
    }

    if (mode === QuizMode.DIFFICULT) {
      const [userWords, difficultWords] = await Promise.all([
        this.prisma.userWord.findMany({
          where: { userId },
          select: { wordId: true },
        }),
        this.prisma.userWord.findMany({
          where: {
            userId,
            OR: [{ lapses: { gt: 0 } }, { status: 'LEARNING' }],
          },
          orderBy: [{ lapses: 'desc' }, { updatedAt: 'desc' }],
          select: { wordId: true },
        }),
      ]);
      if (difficultWords.length === 0) {
        throw new BadRequestException(
          'No difficult words yet. Continue learning first.',
        );
      }
      const difficultIds = new Set(difficultWords.map((ref) => ref.wordId));
      return [
        ...difficultWords,
        ...userWords.filter((ref) => !difficultIds.has(ref.wordId)),
      ];
    }

    const [userWords, attemptedQuestions] = await Promise.all([
      this.prisma.userWord.findMany({
        where: { userId },
        select: { wordId: true },
      }),
      this.prisma.testQuestion.findMany({
        where: {
          test: { userId, submittedAt: { not: null } },
          selectedAnswer: { not: null },
        },
        select: { wordId: true, selectedAnswer: true, correctAnswer: true },
        take: 1000,
      }),
    ]);
    const missedIds = new Set(
      attemptedQuestions
        .filter(
          (q) =>
            (q.selectedAnswer ?? '').trim().toLocaleLowerCase() !==
            q.correctAnswer.trim().toLocaleLowerCase(),
        )
        .map((q) => q.wordId),
    );
    if (missedIds.size === 0) {
      throw new BadRequestException(
        'No missed answers yet. Complete a quiz first.',
      );
    }
    return [
      ...userWords.filter((ref) => missedIds.has(ref.wordId)),
      ...userWords.filter((ref) => !missedIds.has(ref.wordId)),
    ];
  }

  private clozePrompt(example: string, target: string): string {
    const index = this.findWholeWordIndex(example, target);
    if (index < 0) return example;
    return `${example.slice(0, index)}______${example.slice(index + target.length)}`;
  }

  private findWholeWordIndex(text: string, target: string): number {
    const escaped = target.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escaped) return -1;
    const matcher = new RegExp(
      `(?<![\\p{L}\\p{M}\\p{N}_])${escaped}(?![\\p{L}\\p{M}\\p{N}_])`,
      'iu',
    );
    return matcher.exec(text)?.index ?? -1;
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
      return this.submittedResult(test);
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
        selectedAnswer !== null &&
        selectedAnswer.trim().toLocaleLowerCase() ===
          q.correctAnswer.trim().toLocaleLowerCase();
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
    try {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.test.updateMany({
          where: { id: test.id, userId, submittedAt: null },
          data: { score, submittedAt: new Date() },
        });
        if (claimed.count === 0) {
          throw new BadRequestException('Test submission raced');
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
    } catch (error) {
      // A concurrent retry may have committed after our initial read.
      const latest = await this.prisma.test.findFirst({
        where: { id: dto.testId, userId },
        include: { questions: true },
      });
      if (latest?.submittedAt) return this.submittedResult(latest);
      throw error;
    }

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

  private submittedResult(
    test: Prisma.TestGetPayload<{ include: { questions: true } }>,
  ): SubmitTestResponseDto {
    const score = test.score;
    const total = test.questions.length;
    return plainToInstance(
      SubmitTestResponseDto,
      {
        testId: test.id,
        score,
        total,
        percentage: total > 0 ? Math.round((score / total) * 100) : 0,
        questions: test.questions.map((q) => ({
          id: q.id,
          wordId: q.wordId,
          selectedAnswer: q.selectedAnswer,
          correctAnswer: q.correctAnswer,
        })),
      },
      { excludeExtraneousValues: true },
    );
  }
}
