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
import { CefrLevel, ReviewRating, WordStatus } from '@prisma/client';

export interface StoredUser {
  id: string;
  email: string;
  password: string;
  passwordChangedAt: Date;
  dailyGoal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredWord {
  id: string;
  word: string;
  translation: string;
  example: string | null;
  audioUrl: string | null;
  createdById: string;
  deckId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredDeck {
  id: string;
  title: string;
  description: string | null;
  level: CefrLevel | null;
  isSystem: boolean;
  isPublic: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredDeckEnrollment {
  id: string;
  userId: string;
  deckId: string;
  createdAt: Date;
}

export interface StoredUserWord {
  id: string;
  userId: string;
  wordId: string;
  status: WordStatus;
  repetitionCount: number;
  lapses: number;
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

export interface StoredReview {
  id: string;
  userId: string;
  wordId: string;
  rating: ReviewRating;
  createdAt: Date;
}

interface Counters {
  user: number;
  word: number;
  deck: number;
  deckEnrollment: number;
  userWord: number;
  test: number;
  testQuestion: number;
  refreshToken: number;
  review: number;
}

function uuid(_prefix: string, _n: number): string {
  return randomUUID();
}

export function buildPrismaStub() {
  const users = new Map<string, StoredUser>();
  const words = new Map<string, StoredWord>();
  const decks = new Map<string, StoredDeck>();
  const deckEnrollments = new Map<string, StoredDeckEnrollment>();
  const userWords = new Map<string, StoredUserWord>();
  const tests = new Map<string, StoredTest>();
  const testQuestions = new Map<string, StoredTestQuestion>();
  const refreshTokens = new Map<string, StoredRefreshToken>();
  const reviews = new Map<string, StoredReview>();
  const counters: Counters = {
    user: 0,
    word: 0,
    deck: 0,
    deckEnrollment: 0,
    userWord: 0,
    test: 0,
    testQuestion: 0,
    refreshToken: 0,
    review: 0,
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
        dailyGoal: data.dailyGoal ?? 20,
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

  // Applies the `{ createdById, userWords: { some: { userId, status } } }`
  // where shape used by GET /words (optionally with a status filter).
  function matchesWordWhere(w: StoredWord, where: any = {}): boolean {
    if (where.createdById && w.createdById !== where.createdById) return false;
    if (where.deckId !== undefined && w.deckId !== where.deckId) return false;
    const some = where.userWords?.some;
    if (some) {
      const hit = [...userWords.values()].some(
        (uw) =>
          uw.wordId === w.id &&
          (!some.userId || uw.userId === some.userId) &&
          (!some.status || uw.status === some.status),
      );
      if (!hit) return false;
    }
    return true;
  }

  const word = {
    create: jest.fn(async ({ data }: any) => {
      counters.word += 1;
      const now = new Date();
      const w: StoredWord = {
        id: uuid('word', counters.word),
        word: data.word,
        translation: data.translation,
        example: data.example ?? null,
        audioUrl: data.audioUrl ?? null,
        createdById: data.createdById,
        deckId: data.deckId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      words.set(w.id, w);
      return w;
    }),
    createMany: jest.fn(async ({ data }: any) => {
      const rows: any[] = Array.isArray(data) ? data : [data];
      for (const d of rows) {
        counters.word += 1;
        const now = new Date();
        const w: StoredWord = {
          id: uuid('word', counters.word),
          word: d.word,
          translation: d.translation,
          example: d.example ?? null,
          audioUrl: d.audioUrl ?? null,
          createdById: d.createdById,
          deckId: d.deckId ?? null,
          createdAt: now,
          updatedAt: now,
        };
        words.set(w.id, w);
      }
      return { count: rows.length };
    }),
    findUnique: jest.fn(async ({ where }: any) => words.get(where.id) ?? null),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = words.get(where.id);
      if (!existing) {
        const { Prisma } = await import('@prisma/client');
        throw new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        });
      }
      const updated = { ...existing, ...data, updatedAt: new Date() };
      words.set(where.id, updated);
      return updated;
    }),
    findMany: jest.fn(async (args: any = {}) => {
      let list = [...words.values()].filter((w) =>
        matchesWordWhere(w, args.where),
      );
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
      return [...words.values()].filter((w) =>
        matchesWordWhere(w, args.where),
      ).length;
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
        lapses: data.lapses ?? 0,
        lastReviewedAt: data.lastReviewedAt ?? null,
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
      const where = args.where ?? {};
      let list = [...userWords.values()];
      if (where.userId) {
        list = list.filter((uw) => uw.userId === where.userId);
      }
      if (where.status?.in) {
        const allowed: WordStatus[] = where.status.in;
        list = list.filter((uw) => allowed.includes(uw.status));
      }
      if (where.wordId?.in) {
        const ids: string[] = where.wordId.in;
        list = list.filter((uw) => ids.includes(uw.wordId));
      }
      if (where.lapses?.gte !== undefined) {
        list = list.filter((uw) => uw.lapses >= where.lapses.gte);
      }
      // Supports the leech ordering: [{ lapses: 'desc' }, { lastReviewedAt: 'desc' }].
      const orderBy = Array.isArray(args.orderBy)
        ? args.orderBy
        : args.orderBy
          ? [args.orderBy]
          : [];
      if (orderBy.length > 0) {
        list.sort((a, b) => {
          for (const clause of orderBy) {
            const [field, dir] = Object.entries(clause)[0] as [
              keyof StoredUserWord,
              'asc' | 'desc',
            ];
            const av = a[field];
            const bv = b[field];
            const an = av instanceof Date ? av.getTime() : (av as number);
            const bn = bv instanceof Date ? bv.getTime() : (bv as number);
            if (an === bn) continue;
            return dir === 'desc' ? bn - an : an - bn;
          }
          return 0;
        });
      }
      if (args.take !== undefined) list = list.slice(0, args.take);
      const withWord = (uw: StoredUserWord) =>
        args.include?.word ? { ...uw, word: words.get(uw.wordId) } : uw;
      const sel = args.select;
      if (sel) {
        return list.map((uw) => {
          const out: Record<string, unknown> = {};
          if (sel.wordId) out.wordId = uw.wordId;
          if (sel.status) out.status = uw.status;
          if (sel.lapses) out.lapses = uw.lapses;
          if (sel.lastReviewedAt) out.lastReviewedAt = uw.lastReviewedAt;
          return out;
        });
      }
      return list.map(withWord);
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

  // Recursively evaluates the deck `where` shapes the service builds: nested
  // AND/OR plus the leaf fields (id, isSystem, isPublic, createdById, level,
  // title contains, enrollments.some).
  function deckMatches(d: StoredDeck, where: any = {}): boolean {
    if (!where) return true;
    if (Array.isArray(where.AND)) {
      if (!where.AND.every((w: any) => deckMatches(d, w))) return false;
    }
    if (Array.isArray(where.OR)) {
      if (!where.OR.some((w: any) => deckMatches(d, w))) return false;
    }
    if (where.id !== undefined && d.id !== where.id) return false;
    if (where.isSystem !== undefined && d.isSystem !== where.isSystem) return false;
    if (where.isPublic !== undefined && d.isPublic !== where.isPublic) return false;
    if (where.createdById !== undefined && d.createdById !== where.createdById)
      return false;
    if (where.level !== undefined && d.level !== where.level) return false;
    if (where.title?.contains !== undefined) {
      if (
        !d.title
          .toLowerCase()
          .includes(String(where.title.contains).toLowerCase())
      )
        return false;
    }
    const some = where.enrollments?.some;
    if (some) {
      const hit = [...deckEnrollments.values()].some(
        (e) => e.deckId === d.id && (!some.userId || e.userId === some.userId),
      );
      if (!hit) return false;
    }
    return true;
  }

  function countDeckWords(deckId: string): number {
    return [...words.values()].filter((w) => w.deckId === deckId).length;
  }

  function withDeckIncludes(d: StoredDeck, include: any = {}) {
    const out: Record<string, unknown> = { ...d };
    if (include?._count?.select?.words) {
      out._count = { words: countDeckWords(d.id) };
    }
    if (include?.words) {
      out.words = [...words.values()]
        .filter((w) => w.deckId === d.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    return out;
  }

  const deck = {
    create: jest.fn(async ({ data, include }: any) => {
      counters.deck += 1;
      const now = new Date();
      const d: StoredDeck = {
        id: uuid('deck', counters.deck),
        title: data.title,
        description: data.description ?? null,
        level: data.level ?? null,
        isSystem: data.isSystem ?? false,
        isPublic: data.isPublic ?? false,
        createdById: data.createdById ?? null,
        createdAt: now,
        updatedAt: now,
      };
      decks.set(d.id, d);
      return withDeckIncludes(d, include);
    }),
    findUnique: jest.fn(async ({ where }: any) => decks.get(where.id) ?? null),
    findFirst: jest.fn(async (args: any = {}) => {
      for (const d of decks.values()) {
        if (deckMatches(d, args.where)) return withDeckIncludes(d, args.include);
      }
      return null;
    }),
    findMany: jest.fn(async (args: any = {}) => {
      let list = [...decks.values()].filter((d) => deckMatches(d, args.where));
      if (args.skip) list = list.slice(args.skip);
      if (args.take !== undefined) list = list.slice(0, args.take);
      return list.map((d) => withDeckIncludes(d, args.include));
    }),
    count: jest.fn(async (args: any = {}) => {
      return [...decks.values()].filter((d) => deckMatches(d, args.where)).length;
    }),
    update: jest.fn(async ({ where, data, include }: any) => {
      const existing = decks.get(where.id);
      if (!existing) {
        const { Prisma } = await import('@prisma/client');
        throw new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        });
      }
      const updated = { ...existing, ...data, updatedAt: new Date() };
      decks.set(where.id, updated);
      return withDeckIncludes(updated, include);
    }),
    delete: jest.fn(async ({ where }: any) => {
      const d = decks.get(where.id);
      if (!d) {
        const { Prisma } = await import('@prisma/client');
        throw new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        });
      }
      // Cascade: remove the deck's words (and their userWord rows) plus any
      // enrollments, mirroring the schema's onDelete: Cascade relations.
      for (const w of [...words.values()]) {
        if (w.deckId === where.id) {
          for (const [uwId, uw] of userWords) {
            if (uw.wordId === w.id) userWords.delete(uwId);
          }
          words.delete(w.id);
        }
      }
      for (const [eId, e] of deckEnrollments) {
        if (e.deckId === where.id) deckEnrollments.delete(eId);
      }
      decks.delete(where.id);
      return d;
    }),
  };

  const deckEnrollment = {
    findMany: jest.fn(async (args: any = {}) => {
      const where = args.where ?? {};
      let list = [...deckEnrollments.values()];
      if (where.userId) list = list.filter((e) => e.userId === where.userId);
      if (where.deckId?.in) {
        const ids: string[] = where.deckId.in;
        list = list.filter((e) => ids.includes(e.deckId));
      }
      if (args.select?.deckId) return list.map((e) => ({ deckId: e.deckId }));
      return list;
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      const key = where.userId_deckId;
      if (!key) return null;
      for (const e of deckEnrollments.values()) {
        if (e.userId === key.userId && e.deckId === key.deckId) return e;
      }
      return null;
    }),
    upsert: jest.fn(async ({ where, create }: any) => {
      const key = where.userId_deckId;
      for (const e of deckEnrollments.values()) {
        if (e.userId === key.userId && e.deckId === key.deckId) return e;
      }
      counters.deckEnrollment += 1;
      const e: StoredDeckEnrollment = {
        id: uuid('enroll', counters.deckEnrollment),
        userId: create.userId,
        deckId: create.deckId,
        createdAt: new Date(),
      };
      deckEnrollments.set(e.id, e);
      return e;
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

  const review = {
    create: jest.fn(async ({ data }: any) => {
      counters.review += 1;
      const r: StoredReview = {
        id: uuid('review', counters.review),
        userId: data.userId,
        wordId: data.wordId,
        rating: data.rating,
        createdAt: data.createdAt ?? new Date(),
      };
      reviews.set(r.id, r);
      return r;
    }),
    findMany: jest.fn(async (args: any = {}) => {
      const where = args.where ?? {};
      let list = [...reviews.values()];
      if (where.userId) list = list.filter((r) => r.userId === where.userId);
      if (where.createdAt?.gte) {
        list = list.filter((r) => r.createdAt >= where.createdAt.gte);
      }
      if (args.select?.createdAt) return list.map((r) => ({ createdAt: r.createdAt }));
      return list;
    }),
    count: jest.fn(async (args: any = {}) => {
      const where = args.where ?? {};
      let list = [...reviews.values()];
      if (where.userId) list = list.filter((r) => r.userId === where.userId);
      if (where.createdAt?.gte) {
        list = list.filter((r) => r.createdAt >= where.createdAt.gte);
      }
      return list.length;
    }),
  };

  const stub: Record<string, unknown> = {
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
    user,
    word,
    deck,
    deckEnrollment,
    userWord,
    test,
    testQuestion,
    refreshToken,
    review,
    _stores: {
      users,
      words,
      decks,
      deckEnrollments,
      userWords,
      tests,
      testQuestions,
      refreshTokens,
      reviews,
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
