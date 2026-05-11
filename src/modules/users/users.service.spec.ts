import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

type MockedPrisma = {
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  refreshToken: {
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'a@b.c',
    password: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
    passwordChangedAt: new Date(),
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: MockedPrisma;

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findByIdOrThrow', () => {
    it('returns the user when found', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      await expect(service.findByIdOrThrow('u1')).resolves.toBe(user);
    });

    it('throws NotFound when missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findByIdOrThrow('u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates only fields that are defined on the DTO', async () => {
      prisma.user.update.mockResolvedValue(buildUser({ email: 'new@x.y' }));

      await service.update('u1', { email: 'new@x.y' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { email: 'new@x.y' },
      });
    });

    it('emits an empty data update when the DTO is empty', async () => {
      prisma.user.update.mockResolvedValue(buildUser());

      await service.update('u1', {});

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {},
      });
    });

    it('converts Prisma P2002 to ConflictException', async () => {
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'x',
        }),
      );

      await expect(
        service.update('u1', { email: 'taken@x.y' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows non-P2002 Prisma errors', async () => {
      const err = new Prisma.PrismaClientKnownRequestError('boom', {
        code: 'P9999',
        clientVersion: 'x',
      });
      prisma.user.update.mockRejectedValue(err);

      await expect(service.update('u1', { email: 'x@y.z' })).rejects.toBe(err);
    });
  });

  describe('changePassword', () => {
    const CURRENT = 'CurrentPass123!';
    const NEW = 'NewBetterPass456!';

    async function userWithPassword(plain: string): Promise<User> {
      return buildUser({ password: await bcrypt.hash(plain, 10) });
    }

    it('throws Unauthorized when current password is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(await userWithPassword(CURRENT));

      await expect(
        service.changePassword('u1', {
          currentPassword: 'wrong',
          newPassword: NEW,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws BadRequest when the new password equals the current one', async () => {
      prisma.user.findUnique.mockResolvedValue(await userWithPassword(CURRENT));

      await expect(
        service.changePassword('u1', {
          currentPassword: CURRENT,
          newPassword: CURRENT,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('persists a NEW bcrypt hash on success', async () => {
      const user = await userWithPassword(CURRENT);
      const previousHash = user.password;
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      await service.changePassword('u1', {
        currentPassword: CURRENT,
        newPassword: NEW,
      });

      const call = prisma.user.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'u1' });
      expect(call.data.password).not.toBe(previousHash);
      expect(call.data.password).not.toBe(NEW); // hashed, not plaintext
      expect(await bcrypt.compare(NEW, call.data.password)).toBe(true);
    });

    it('bumps passwordChangedAt and revokes all refresh tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(await userWithPassword(CURRENT));
      prisma.user.update.mockResolvedValue(buildUser());

      const before = Date.now();
      await service.changePassword('u1', {
        currentPassword: CURRENT,
        newPassword: NEW,
      });
      const after = Date.now();

      const updateCall = prisma.user.update.mock.calls[0][0];
      const bumpedAt = (updateCall.data.passwordChangedAt as Date).getTime();
      expect(bumpedAt).toBeGreaterThanOrEqual(before);
      expect(bumpedAt).toBeLessThanOrEqual(after);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('returns void on success', async () => {
      prisma.user.findUnique.mockResolvedValue(await userWithPassword(CURRENT));
      prisma.user.update.mockResolvedValue(buildUser());

      await expect(
        service.changePassword('u1', {
          currentPassword: CURRENT,
          newPassword: NEW,
        }),
      ).resolves.toBeUndefined();
    });
  });
});
