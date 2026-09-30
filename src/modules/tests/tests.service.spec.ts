import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TestsService } from './tests.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QuizMode } from '@prisma/client';

type MockedPrisma = {
  userWord: { findMany: jest.Mock };
  word: { findMany: jest.Mock };
  test: { create: jest.Mock; findFirst: jest.Mock; updateMany: jest.Mock };
  testQuestion: { update: jest.Mock; findMany: jest.Mock };
  $transaction: jest.Mock;
};

// startTest first reads the user's UserWord ids, then loads the pooled words.
function makeWordRefs(n: number) {
  return Array.from({ length: n }, (_, i) => ({ wordId: `w${i}` }));
}
function makeWords(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`,
    word: `word${i}`,
    translation: `translation${i}`,
    example: null,
    audioUrl: null,
  }));
}

describe('TestsService', () => {
  let service: TestsService;
  let prisma: MockedPrisma;

  beforeEach(async () => {
    prisma = {
      userWord: { findMany: jest.fn() },
      word: { findMany: jest.fn() },
      test: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
      testQuestion: {
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      // Support both the callback form (submitTest) and the array form.
      $transaction: jest.fn((input: unknown) =>
        typeof input === 'function'
          ? (input as (tx: unknown) => unknown)(prisma)
          : Promise.all(input as Promise<unknown>[]),
      ),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TestsService);
  });

  describe('startTest', () => {
    it('rejects when the user has fewer than 5 words', async () => {
      prisma.userWord.findMany.mockResolvedValue(makeWordRefs(4));

      await expect(service.startTest('u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.word.findMany).not.toHaveBeenCalled();
      expect(prisma.test.create).not.toHaveBeenCalled();
    });

    it('samples a random pool of word ids rather than the earliest rows', async () => {
      prisma.userWord.findMany.mockResolvedValue(makeWordRefs(6));
      prisma.word.findMany.mockResolvedValue(makeWords(6));
      prisma.test.create.mockResolvedValue({ id: 't1' });

      await service.startTest('u1');

      // The id lookup selects only wordId (cheap), unfiltered by insertion order.
      const refArg = prisma.userWord.findMany.mock.calls[0][0];
      expect(refArg.select).toEqual({ wordId: true });
      // The pooled words are loaded by an `id IN (...)` of at most 2x the count.
      const wordArg = prisma.word.findMany.mock.calls[0][0];
      expect(wordArg.where.id.in.length).toBeLessThanOrEqual(10);
    });

    it('persists the challenge (with correctAnswer) and never leaks it to the client', async () => {
      prisma.userWord.findMany.mockResolvedValue(makeWordRefs(6));
      prisma.word.findMany.mockResolvedValue(makeWords(6));
      prisma.test.create.mockResolvedValue({ id: 't1' });

      const result = await service.startTest('u1');

      // The answer key is written server-side at start time...
      const createArg = prisma.test.create.mock.calls[0][0];
      expect(createArg.data.userId).toBe('u1');
      expect(createArg.data.questions.create).toHaveLength(5);
      expect(createArg.data.questions.create[0]).toHaveProperty(
        'correctAnswer',
      );

      // ...but the response exposes only the testId, word, and options.
      expect(result.testId).toBe('t1');
      expect(result.questions).toHaveLength(5);
      for (const q of result.questions) {
        expect(q).not.toHaveProperty('correctAnswer');
        // one correct + three distractors, shuffled
        expect(q.options).toHaveLength(4);
      }
    });

    it('builds a reverse recall exercise and grades its English answer', async () => {
      prisma.userWord.findMany.mockResolvedValue(makeWordRefs(6));
      prisma.word.findMany.mockResolvedValue(makeWords(6));
      prisma.test.create.mockResolvedValue({ id: 't1' });

      const result = await service.startTest('u1', QuizMode.REVERSE);
      const createArg = prisma.test.create.mock.calls[0][0];
      expect(createArg.data.questions.create[0].mode).toBe(QuizMode.REVERSE);
      expect(createArg.data.questions.create[0].correctAnswer).toMatch(/^word/);
      expect(result.questions[0].word).toMatch(/^translation/);
      expect(result.questions[0].options).toContain(
        createArg.data.questions.create[0].correctAnswer,
      );
    });

    it('requires example sentences containing the target word for cloze quizzes', async () => {
      prisma.userWord.findMany.mockResolvedValue(makeWordRefs(6));
      prisma.word.findMany.mockResolvedValue(makeWords(6));
      await expect(
        service.startTest('u1', QuizMode.CLOZE),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.test.create).not.toHaveBeenCalled();
    });

    it('scans beyond the first 100 words to find enough cloze candidates', async () => {
      prisma.userWord.findMany.mockResolvedValue(makeWordRefs(105));
      prisma.word.findMany.mockImplementation(({ where }) =>
        Promise.resolve(
          where.id.in.map((id: string) => {
            const word = `word${id.slice(1)}`;
            const matches = Number(id.slice(1)) >= 100;
            return {
              id,
              word,
              translation: `translation${id.slice(1)}`,
              example: matches ? `I learned ${word} today.` : null,
              audioUrl: null,
            };
          }),
        ),
      );
      prisma.test.create.mockResolvedValue({ id: 't1' });

      const result = await service.startTest('u1', QuizMode.CLOZE);

      expect(prisma.word.findMany).toHaveBeenCalledTimes(2);
      expect(result.questions).toHaveLength(5);
      expect(result.questions[0].prompt).toContain('______');
    });

    it('matches whole words in cloze examples instead of substrings', async () => {
      prisma.userWord.findMany.mockResolvedValue(makeWordRefs(6));
      prisma.word.findMany.mockResolvedValue([
        { ...makeWords(1)[0], word: 'he', example: 'There is a book.' },
        ...makeWords(6)
          .slice(1)
          .map((word) => ({
            ...word,
            example: `I learned ${word.word} today.`,
          })),
      ]);
      prisma.test.create.mockResolvedValue({ id: 't1' });

      const result = await service.startTest('u1', QuizMode.CLOZE);

      expect(result.questions).toHaveLength(5);
      expect(result.questions.map((question) => question.prompt)).not.toContain(
        'T______re is a book.',
      );
      expect(
        result.questions.every((question) =>
          question.prompt.includes('______'),
        ),
      ).toBe(true);
    });

    it('does not treat a base letter before a combining mark as a whole word', async () => {
      prisma.userWord.findMany.mockResolvedValue(makeWordRefs(6));
      prisma.word.findMany.mockResolvedValue([
        { ...makeWords(1)[0], word: 'e', example: 'e\u0301lan is a word.' },
        ...makeWords(6)
          .slice(1)
          .map((word) => ({
            ...word,
            example: `I learned ${word.word} today.`,
          })),
      ]);
      prisma.test.create.mockResolvedValue({ id: 't1' });

      const result = await service.startTest('u1', QuizMode.CLOZE);

      expect(result.questions).toHaveLength(5);
      expect(result.questions.map((question) => question.prompt)).not.toContain(
        '______\u0301lan is a word.',
      );
    });

    it('prioritizes previously missed words in targeted practice', async () => {
      prisma.userWord.findMany.mockResolvedValue(makeWordRefs(7));
      prisma.testQuestion.findMany.mockResolvedValue([
        { wordId: 'w3', selectedAnswer: 'wrong', correctAnswer: 'right' },
        { wordId: 'w4', selectedAnswer: 'answer', correctAnswer: 'answer' },
      ]);
      prisma.word.findMany.mockResolvedValue(makeWords(7));
      prisma.test.create.mockResolvedValue({ id: 't1' });

      await service.startTest('u1', QuizMode.MISTAKES);

      expect(
        prisma.test.create.mock.calls[0][0].data.questions.create[0].wordId,
      ).toBe('w3');
      expect(prisma.testQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            test: { userId: 'u1', submittedAt: { not: null } },
          }),
        }),
      );
    });
  });

  describe('submitTest', () => {
    const submitDto = (testId: string) => ({
      testId,
      answers: [
        { wordId: 'w0', selectedAnswer: 'translation0' }, // correct
        { wordId: 'w1', selectedAnswer: 'wrong' }, // wrong
        { wordId: 'intruder', selectedAnswer: 'translation2' }, // not in test → ignored
      ],
    });

    function pendingTest() {
      return {
        id: 't1',
        userId: 'u1',
        score: 0,
        submittedAt: null,
        questions: [
          {
            id: 'q0',
            wordId: 'w0',
            correctAnswer: 'translation0',
            selectedAnswer: null,
          },
          {
            id: 'q1',
            wordId: 'w1',
            correctAnswer: 'translation1',
            selectedAnswer: null,
          },
          {
            id: 'q2',
            wordId: 'w2',
            correctAnswer: 'translation2',
            selectedAnswer: null,
          },
        ],
      };
    }

    it('throws NotFound when the test does not exist for this user', async () => {
      prisma.test.findFirst.mockResolvedValue(null);

      await expect(
        service.submitTest(submitDto('missing'), 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the original result for an already-submitted retry', async () => {
      prisma.test.findFirst.mockResolvedValue({
        ...pendingTest(),
        score: 2,
        submittedAt: new Date(),
        questions: pendingTest().questions.map((q, i) => ({
          ...q,
          selectedAnswer: i < 2 ? q.correctAnswer : null,
        })),
      });

      const result = await service.submitTest(submitDto('t1'), 'u1');
      expect(result.score).toBe(2);
      expect(result.questions[0].selectedAnswer).toBe('translation0');
    });

    it('returns the committed result when a concurrent retry loses the claim', async () => {
      prisma.test.findFirst
        .mockResolvedValueOnce(pendingTest())
        .mockResolvedValueOnce({
          ...pendingTest(),
          score: 1,
          submittedAt: new Date(),
          questions: pendingTest().questions.map((q, i) => ({
            ...q,
            selectedAnswer: i === 0 ? q.correctAnswer : null,
          })),
        });
      prisma.test.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.submitTest(submitDto('t1'), 'u1');
      expect(result.score).toBe(1);
      expect(prisma.testQuestion.update).not.toHaveBeenCalled();
    });

    it('grades against the stored answer key, ignoring foreign wordIds', async () => {
      prisma.test.findFirst.mockResolvedValue(pendingTest());
      prisma.test.updateMany.mockResolvedValue({ count: 1 });
      prisma.testQuestion.update.mockResolvedValue({});

      const result = await service.submitTest(submitDto('t1'), 'u1');

      // w0 correct; w1 wrong; w2 unanswered (the 'intruder' answer is ignored).
      expect(result.score).toBe(1);
      expect(result.total).toBe(3);
      expect(result.percentage).toBe(33);
      const q2 = result.questions.find((q) => q.wordId === 'w2');
      expect(q2?.selectedAnswer).toBeNull();
    });

    it('claims the test atomically (updateMany guarded on submittedAt: null)', async () => {
      prisma.test.findFirst.mockResolvedValue(pendingTest());
      prisma.test.updateMany.mockResolvedValue({ count: 1 });
      prisma.testQuestion.update.mockResolvedValue({});

      await service.submitTest(submitDto('t1'), 'u1');

      const claimArg = prisma.test.updateMany.mock.calls[0][0];
      expect(claimArg.where).toEqual({
        id: 't1',
        userId: 'u1',
        submittedAt: null,
      });
      expect(claimArg.data.score).toBe(1);
      expect(claimArg.data.submittedAt).toBeInstanceOf(Date);
    });
  });
});
