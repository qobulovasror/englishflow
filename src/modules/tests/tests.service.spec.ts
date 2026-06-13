import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TestsService } from './tests.service';
import { PrismaService } from '../../prisma/prisma.service';

type MockedPrisma = {
  word: { findMany: jest.Mock };
  test: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  testQuestion: { update: jest.Mock };
  $transaction: jest.Mock;
};

function makeWords(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`,
    word: `word${i}`,
    translation: `translation${i}`,
    example: null,
  }));
}

describe('TestsService', () => {
  let service: TestsService;
  let prisma: MockedPrisma;

  beforeEach(async () => {
    prisma = {
      word: { findMany: jest.fn() },
      test: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      testQuestion: { update: jest.fn() },
      // The service passes an array of update promises; just resolve them all.
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TestsService);
  });

  describe('startTest', () => {
    it('rejects when the user has fewer than 5 words', async () => {
      prisma.word.findMany.mockResolvedValue(makeWords(4));

      await expect(service.startTest('u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.test.create).not.toHaveBeenCalled();
    });

    it('persists the challenge (with correctAnswer) and never leaks it to the client', async () => {
      prisma.word.findMany.mockResolvedValue(makeWords(6));
      prisma.test.create.mockResolvedValue({ id: 't1' });

      const result = await service.startTest('u1');

      // The answer key is written server-side at start time...
      const createArg = prisma.test.create.mock.calls[0][0];
      expect(createArg.data.userId).toBe('u1');
      expect(createArg.data.questions.create).toHaveLength(5);
      expect(createArg.data.questions.create[0]).toHaveProperty('correctAnswer');

      // ...but the response exposes only the testId, word, and options.
      expect(result.testId).toBe('t1');
      expect(result.questions).toHaveLength(5);
      for (const q of result.questions) {
        expect(q).not.toHaveProperty('correctAnswer');
        // one correct + three distractors, shuffled
        expect(q.options).toHaveLength(4);
      }
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
        submittedAt: null,
        questions: [
          { id: 'q0', wordId: 'w0', correctAnswer: 'translation0', selectedAnswer: null },
          { id: 'q1', wordId: 'w1', correctAnswer: 'translation1', selectedAnswer: null },
          { id: 'q2', wordId: 'w2', correctAnswer: 'translation2', selectedAnswer: null },
        ],
      };
    }

    it('throws NotFound when the test does not exist for this user', async () => {
      prisma.test.findFirst.mockResolvedValue(null);

      await expect(
        service.submitTest(submitDto('missing'), 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to grade an already-submitted test', async () => {
      prisma.test.findFirst.mockResolvedValue({
        ...pendingTest(),
        submittedAt: new Date(),
      });

      await expect(
        service.submitTest(submitDto('t1'), 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('grades against the stored answer key, ignoring foreign wordIds', async () => {
      prisma.test.findFirst.mockResolvedValue(pendingTest());
      prisma.testQuestion.update.mockResolvedValue({});
      prisma.test.update.mockResolvedValue({});

      const result = await service.submitTest(submitDto('t1'), 'u1');

      // w0 correct; w1 wrong; w2 unanswered (the 'intruder' answer is ignored).
      expect(result.score).toBe(1);
      expect(result.total).toBe(3);
      expect(result.percentage).toBe(33);
      const q2 = result.questions.find((q) => q.wordId === 'w2');
      expect(q2?.selectedAnswer).toBeNull();
    });

    it('stamps submittedAt so the test cannot be replayed', async () => {
      prisma.test.findFirst.mockResolvedValue(pendingTest());
      prisma.testQuestion.update.mockResolvedValue({});
      prisma.test.update.mockResolvedValue({});

      await service.submitTest(submitDto('t1'), 'u1');

      const updateArg = prisma.test.update.mock.calls[0][0];
      expect(updateArg.data.score).toBe(1);
      expect(updateArg.data.submittedAt).toBeInstanceOf(Date);
    });
  });
});
