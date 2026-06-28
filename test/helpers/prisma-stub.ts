/**
 * In-memory Prisma stub used by e2e tests. Supports the operations the API
 * exercises today; extend as new endpoints are added.
 *
 * Behavioral fidelity vs real Prisma:
 *   - Unique constraint on `users.email` throws P2002 (caught by the filter).
 *   - findMany supports `where`, `orderBy`, `take`, `skip`, `include`, `select`.
 *   - `$transaction([op1, op2, ...])` awaits the operations in order.
 *
 * Anything beyond these is a deliberate gap; add tests + extend together.
 */
import { randomUUID } from 'node:crypto';
import { WordStatus } from '@prisma/client';

export interface StoredUser {
  id: string;
  email: string;
  password: string;
  passwordChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredWord {
  id: string;
  word: string;
  translation: string;
  example: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredUserWord {
  id: string;
  userId: string;
  wordId: string;
  status: WordStatus;
  repetitionCount: number;
  lastReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredTest {
  id: string;
  userId: string;
  score: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredTestQuestion {
  id: string;
  testId: string;
  wordId: string;
  selectedAnswer: string | null;
  correctAnswer: string;
}

export interface StoredRefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

interface Counters {
  user: number;
  word: number;
  userWord: number;
  test: number;
  testQuestion: number;
  refreshToken: number;
}

function uuid(_prefix: string, _n: number): string {
  return randomUUID();
}

export function buildPrismaStub() {
  const users = new Map<string, StoredUser>();
  const words = new Map<string, StoredWord>();
  const userWords = new Map<string, StoredUserWord>();
  const tests = new Map<string, StoredTest>();
  const testQuestions = new Map<string, StoredTestQuestion>();
  const refreshTokens = new Map<string, StoredRefreshToken>();
  const counters: Counters = {
    user: 0,
    word: 0,
    userWord: 0,
    test: 0,
    testQuestion: 0,
    refreshToken: 0,
  };

  async function unique(target: string[]): Promise<never> {
    const { Prisma } = await import('@prisma/client');
    throw new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target },
    });
  }

  const user = {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id) return users.get(where.id) ?? null;
      if (where.email)
        for (const u of users.values()) if (u.email === where.email) return u;
      return null;
    }),
    create: jest.fn(async ({ data }: any) => {
      for (const u of users.values()) if (u.email === data.email) await unique(['email']);
      counters.user += 1;
      const now = new Date();
      const u: StoredUser = {
        id: uuid('user', counters.user),
        email: data.email,
        password: data.password,
        passwordChangedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      users.set(u.id, u);
      return u;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = users.get(where.id);
      if (!existing) throw new Error('User not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      users.set(where.id, updated);
      return updated;
    }),
  };

  const word = {
    create: jest.fn(async ({ data }: any) => {
      counters.word += 1;
      const now = new Date();
      const w: StoredWord = {
        id: uuid('word', counters.word),
        word: data.word,
        translation: data.translation,
        example: data.example ?? null,
        createdById: data.createdById,
        createdAt: now,
        updatedAt: now,
      };
      words.set(w.id, w);
      return w;
    }),
    findUnique: jest.fn(async ({ where }: any) => words.get(where.id) ?? null),
    findMany: jest.fn(async (args: any = {}) => {
      let list = [...words.values()];
      if (args.where?.createdById) {
        list = list.filter((w) => w.createdById === args.where.createdById);
      }
      if (args.orderBy?.createdAt === 'desc') {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (args.orderBy?.createdAt === 'asc') {
        list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
      if (args.skip) list = list.slice(args.skip);
      if (args.take !== undefined) list = list.slice(0, args.take);
      return list;
    }),
    count: jest.fn(async (args: any = {}) => {
      let list = [...words.values()];
      if (args.where?.createdById) {
        list = list.filter((w) => w.createdById === args.where.createdById);
      }
      return list.length;
    }),
    delete: jest.fn(async ({ where }: any) => {
      const w = words.get(where.id);
      if (!w) {
        const { Prisma } = await import('@prisma/client');
        throw new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        });
      }
      words.delete(where.id);
      return w;
    }),
  };

  const userWord = {
    create: jest.fn(async ({ data }: any) => {
      counters.userWord += 1;
      const now = new Date();
      const uw: StoredUserWord = {
        id: uuid('uw', counters.userWord),
        userId: data.userId,
        wordId: data.wordId,
        status: data.status ?? WordStatus.NEW,
        repetitionCount: data.repetitionCount ?? 0,
        lastReviewedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      userWords.set(uw.id, uw);
      return uw;
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      for (const uw of userWords.values()) {
        if (
          (!where.id || uw.id === where.id) &&
          (!where.userId || uw.userId === where.userId)
        ) {
          return uw;
        }
      }
      return null;
    }),
    findMany: jest.fn(async (args: any = {}) => {
      let list = [...userWords.values()];
      if (args.where?.userId) {
        list = list.filter((uw) => uw.userId === args.where.userId);
      }
      if (args.where?.status?.in) {
        const allowed: WordStatus[] = args.where.status.in;
        list = list.filter((uw) => allowed.includes(uw.status));
      }
      if (args.take !== undefined) list = list.slice(0, args.take);
      if (args.include?.word) {
        return list.map((uw) => ({ ...uw, word: words.get(uw.wordId) }));
      }
      return list;
    }),
    count: jest.fn(async (args: any = {}) => {
      let list = [...userWords.values()];
      if (args.where?.userId) {
        list = list.filter((uw) => uw.userId === args.where.userId);
      }
      if (args.where?.status) {
        list = list.filter((uw) => uw.status === args.where.status);
      }
      return list.length;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = userWords.get(where.id);
      if (!existing) throw new Error('UserWord not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      userWords.set(where.id, updated);
      if (data?.word) {
        // shouldn't happen — include via separate path
      }
      const result = words.get(updated.wordId)
        ? { ...updated, word: words.get(updated.wordId) }
        : updated;
      return result;
    }),
  };

  const test = {
    create: jest.fn(async ({ data, include }: any) => {
      counters.test += 1;
      const now = new Date();
      const t: StoredTest = {
        id: uuid('test', counters.test),
        userId: data.userId,
        score: data.score ?? 0,
        submittedAt: data.submittedAt ?? null,
        createdAt: now,
        updatedAt: now,
      };
      tests.set(t.id, t);
      const questions: StoredTestQuestion[] = [];
      if (data.questions?.create) {
        for (const q of data.questions.create as Array<Omit<StoredTestQuestion, 'id' | 'testId'>>) {
          counters.testQuestion += 1;
          const tq: StoredTestQuestion = {
            id: uuid('tq', counters.testQuestion),
            testId: t.id,
            wordId: q.wordId,
            selectedAnswer: q.selectedAnswer ?? null,
            correctAnswer: q.correctAnswer,
          };
          testQuestions.set(tq.id, tq);
          questions.push(tq);
        }
      }
      return include?.questions ? { ...t, questions } : t;
    }),
    findFirst: jest.fn(async (args: any = {}) => {
      const where = args.where ?? {};
      for (const t of tests.values()) {
        if (
          (!where.id || t.id === where.id) &&
          (!where.userId || t.userId === where.userId)
        ) {
          if (args.include?.questions) {
            const questions = [...testQuestions.values()].filter(
              (q) => q.testId === t.id,
            );
            return { ...t, questions };
          }
          return t;
        }
      }
      return null;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = tests.get(where.id);
      if (!existing) throw new Error('Test not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      tests.set(where.id, updated);
      return updated;
    }),
    findMany: jest.fn(async (args: any = {}) => {
      let list = [...tests.values()];
      if (args.where?.userId) {
        list = list.filter((t) => t.userId === args.where.userId);
      }
      if (args.orderBy?.createdAt === 'desc') {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (args.take !== undefined) list = list.slice(0, args.take);
      if (args.select?._count) {
        return list.map((t) => {
          const out: Record<string, unknown> = { _count: {} };
          if (args.select.id) out.id = t.id;
          if (args.select.score) out.score = t.score;
          if (args.select.createdAt) out.createdAt = t.createdAt;
          if (args.select._count.select?.questions) {
            (out._count as Record<string, number>).questions = [
              ...testQuestions.values(),
            ].filter((q) => q.testId === t.id).length;
          }
          return out;
        });
      }
      return list;
    }),
    count: jest.fn(async (args: any = {}) => {
      let list = [...tests.values()];
      if (args.where?.userId) list = list.filter((t) => t.userId === args.where.userId);
      return list.length;
    }),
    aggregate: jest.fn(async (args: any = {}) => {
      let list = [...tests.values()];
      if (args.where?.userId) list = list.filter((t) => t.userId === args.where.userId);
      const sum = list.reduce((acc, t) => acc + t.score, 0);
      return { _avg: { score: list.length === 0 ? null : sum / list.length } };
    }),
  };

  const testQuestion = {
    update: jest.fn(async ({ where, data }: any) => {
      const existing = testQuestions.get(where.id);
      if (!existing) throw new Error('TestQuestion not found');
      const updated = { ...existing, ...data };
      testQuestions.set(where.id, updated);
      return updated;
    }),
  };

  const refreshToken = {
    create: jest.fn(async ({ data }: any) => {
      counters.refreshToken += 1;
      const t: StoredRefreshToken = {
        id: uuid('rt', counters.refreshToken),
        tokenHash: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      };
      refreshTokens.set(data.tokenHash, t);
      return t;
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.tokenHash) return refreshTokens.get(where.tokenHash) ?? null;
      return null;
    }),
    delete: jest.fn(async ({ where }: any) => {
      for (const [hash, t] of refreshTokens) {
        if ((where.id && t.id === where.id) || (where.tokenHash && hash === where.tokenHash)) {
          refreshTokens.delete(hash);
          return t;
        }
      }
      const { Prisma } = await import('@prisma/client');
      throw new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      });
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      let count = 0;
      for (const [hash, t] of refreshTokens) {
        if (t.userId === where.userId) {
          refreshTokens.delete(hash);
          count += 1;
        }
      }
      return { count };
    }),
  };

  const stub: Record<string, unknown> = {
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
    user,
    word,
    userWord,
    test,
    testQuestion,
    refreshToken,
    _stores: {
      users,
      words,
      userWords,
      tests,
      testQuestions,
      refreshTokens,
    },
  };

  // Supports both Prisma transaction shapes:
  //   $transaction([op1, op2])              → array form (sequential await)
  //   $transaction(async (tx) => ...)       → interactive form
  // In the interactive form `tx` is the stub itself; there's no rollback,
  // which is fine for unit-test purposes — the goal is just to exercise the
  // service's call shape.
  stub.$transaction = jest.fn(async (input: unknown) => {
    if (typeof input === 'function') {
      return (input as (tx: typeof stub) => Promise<unknown>)(stub);
    }
    return Promise.all(input as Promise<unknown>[]);
  });

  return stub as PrismaStub;
}

export type PrismaStub = ReturnType<typeof buildPrismaStub>;
