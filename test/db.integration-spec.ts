import { ReviewRating } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DecksService } from '../src/modules/decks/decks.service';
import { LearningService } from '../src/modules/learning/learning.service';
import { TestsService } from '../src/modules/tests/tests.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/modules/users/users.service';
import { Rating } from '../src/common/utils/sm2';

describe('PostgreSQL integration', () => {
  const prisma = new PrismaService();
  const runId = `db-check-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let ownerId: string;
  let learnerId: string;
  let deckId: string;
  let wordId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const owner = await prisma.user.create({
      data: { email: `${runId}-owner@example.test`, password: 'not-used' },
    });
    const learner = await prisma.user.create({
      data: { email: `${runId}-learner@example.test`, password: 'not-used' },
    });
    ownerId = owner.id;
    learnerId = learner.id;

    const deck = await prisma.deck.create({
      data: {
        title: `${runId} deck`,
        isPublic: true,
        createdById: ownerId,
      },
    });
    deckId = deck.id;
    const word = await prisma.word.create({
      data: {
        word: `${runId}-word`,
        translation: 'sinov so‘zi',
        deckId,
        createdById: ownerId,
      },
    });
    wordId = word.id;
  });

  afterAll(async () => {
    const ids = [ownerId, learnerId].filter((id): id is string => Boolean(id));
    if (ids.length > 0)
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('commits a review and its history row together', async () => {
    await prisma.userWord.create({ data: { userId: learnerId, wordId } });
    const service = new LearningService(prisma);
    const daily = await service.getDailyWords(learnerId);

    expect(daily.some((card) => card.wordId === wordId)).toBe(true);

    await service.reviewWord(
      {
        userWordId: daily.find((card) => card.wordId === wordId)!.id,
        rating: Rating.GOOD,
      },
      learnerId,
    );

    const [state, history] = await Promise.all([
      prisma.userWord.findUnique({
        where: { userId_wordId: { userId: learnerId, wordId } },
      }),
      prisma.review.count({ where: { userId: learnerId, wordId } }),
    ]);
    expect(state?.lastReviewedAt).toBeInstanceOf(Date);
    expect(history).toBe(1);
  });

  it('grades a server-owned quiz once', async () => {
    const words = await prisma.word.createManyAndReturn({
      data: Array.from({ length: 4 }, (_, index) => ({
        word: `${runId}-extra-${index}`,
        translation: `${runId}-translation-${index}`,
      })),
    });
    await prisma.userWord.createMany({
      data: words.map((word) => ({ userId: learnerId, wordId: word.id })),
    });

    const service = new TestsService(prisma);
    const challenge = await service.startTest(learnerId);
    const answerKey = await prisma.testQuestion.findMany({
      where: { testId: challenge.testId },
      select: { wordId: true, correctAnswer: true },
    });
    const result = await service.submitTest(
      {
        testId: challenge.testId,
        answers: answerKey.map((item) => ({
          wordId: item.wordId,
          selectedAnswer: item.correctAnswer,
        })),
      },
      learnerId,
    );

    expect(result.score).toBe(result.total);
    const retry = await service.submitTest(
      { testId: challenge.testId, answers: [] },
      learnerId,
    );
    expect(retry.score).toBe(result.score);
    expect(retry.questions).toEqual(result.questions);
  });

  it('enforces the new-word allowance across repeated same-day requests', async () => {
    const dailyUser = await prisma.user.create({
      data: {
        email: `${runId}-daily@example.test`,
        password: 'not-used',
        dailyNewLimit: 3,
      },
    });
    const words = await prisma.word.createManyAndReturn({
      data: Array.from({ length: 7 }, (_, index) => ({
        word: `${runId}-daily-${index}`,
        translation: `${runId}-daily-translation-${index}`,
      })),
    });
    await prisma.userWord.createMany({
      data: words.map((word) => ({ userId: dailyUser.id, wordId: word.id })),
    });

    const service = new LearningService(prisma);
    const [first, second] = await Promise.all([
      service.getDailyWords(dailyUser.id, 300),
      service.getDailyWords(dailyUser.id, 300),
    ]);
    await Promise.all(
      first.map((card) =>
        service.reviewWord(
          { userWordId: card.id, rating: Rating.GOOD },
          dailyUser.id,
        ),
      ),
    );
    const afterCompleting = await service.getDailyWords(dailyUser.id, 300);
    const introduced = await prisma.userWord.count({
      where: {
        userId: dailyUser.id,
        wordId: { in: words.map((word) => word.id) },
        introducedAt: { not: null },
      },
    });

    expect(first).toHaveLength(3);
    expect(second.map((card) => card.id).sort()).toEqual(
      first.map((card) => card.id).sort(),
    );
    expect(afterCompleting).toHaveLength(0);
    expect(introduced).toBe(3);
    await prisma.user.delete({ where: { id: dailyUser.id } });
    await prisma.word.deleteMany({
      where: { id: { in: words.map((word) => word.id) } },
    });
  });

  it('detaches a removed deck word while retaining enrolled learners’ progress', async () => {
    const service = new DecksService(prisma);

    await service.removeWord(deckId, wordId, ownerId);

    const [word, progress] = await Promise.all([
      prisma.word.findUnique({ where: { id: wordId } }),
      prisma.userWord.findUnique({
        where: { userId_wordId: { userId: learnerId, wordId } },
      }),
    ]);
    expect(word?.deckId).toBeNull();
    expect(progress).not.toBeNull();
  });

  it('deletes an account while preserving other learners’ history and archiving its deck', async () => {
    await prisma.userWord.create({ data: { userId: learnerId, wordId } });
    await prisma.review.create({
      data: { userId: learnerId, wordId, rating: ReviewRating.GOOD },
    });
    const challenge = await prisma.test.create({
      data: {
        userId: learnerId,
        questions: { create: { wordId, correctAnswer: 'sinov so‘zi' } },
      },
    });
    const ownProgress = await prisma.userWord.create({
      data: { userId: ownerId, wordId },
    });
    const password = 'integration-password';
    await prisma.user.update({
      where: { id: ownerId },
      data: { password: await bcrypt.hash(password, 4) },
    });

    await new UsersService(prisma, new DecksService(prisma)).deleteAccount(
      ownerId,
      password,
    );

    const [
      archivedDeck,
      retainedWord,
      learnerProgress,
      history,
      quizQuestion,
      ownerRow,
      ownerOwnProgress,
    ] = await Promise.all([
      prisma.deck.findUnique({ where: { id: deckId } }),
      prisma.word.findUnique({ where: { id: wordId } }),
      prisma.userWord.findUnique({
        where: { userId_wordId: { userId: learnerId, wordId } },
      }),
      prisma.review.count({ where: { userId: learnerId, wordId } }),
      prisma.testQuestion.count({ where: { testId: challenge.id } }),
      prisma.user.findUnique({ where: { id: ownerId } }),
      prisma.userWord.findUnique({ where: { id: ownProgress.id } }),
    ]);
    expect(archivedDeck?.deletedAt).toBeInstanceOf(Date);
    expect(archivedDeck?.createdById).toBeNull();
    expect(retainedWord?.createdById).toBeNull();
    expect(learnerProgress).not.toBeNull();
    expect(history).toBe(1);
    expect(quizQuestion).toBe(1);
    expect(ownerRow).toBeNull();
    expect(ownerOwnProgress).toBeNull();
  });
});
