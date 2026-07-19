import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthTokenType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshTokensService } from './refresh-tokens.service';
import { AuthTokensService } from './auth-tokens.service';
import { MailerService } from '../../common/mailer/mailer.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let authTokens: jest.Mocked<AuthTokensService>;
  let mailer: jest.Mocked<MailerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
            findByIdOrThrow: jest.fn(),
            resetPassword: jest.fn(),
            markEmailVerified: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'jwt-token') },
        },
        {
          provide: RefreshTokensService,
          useValue: {
            issue: jest.fn().mockResolvedValue({
              token: 'refresh-token',
              expiresAt: new Date(),
            }),
            rotate: jest.fn(),
            revoke: jest.fn(),
            revokeAllForUser: jest.fn(),
          },
        },
        {
          provide: AuthTokensService,
          useValue: {
            issue: jest.fn().mockResolvedValue({
              token: 'opaque-token',
              expiresAt: new Date(),
            }),
            consume: jest.fn(),
          },
        },
        {
          provide: MailerService,
          useValue: { send: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(() => ({
              frontendUrl: 'http://localhost:5173',
            })),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    authTokens = module.get(AuthTokensService);
    mailer = module.get(MailerService);
  });

  describe('register', () => {
    it('rejects an already-registered email', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        password: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordChangedAt: new Date(),
      });

      await expect(
        service.register({ email: 'a@b.c', password: 'pw' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('hashes the password before persisting', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(async (dto) => ({
        id: 'u1',
        email: dto.email,
        password: dto.password,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordChangedAt: new Date(),
      }));

      await service.register({ email: 'a@b.c', password: 'plain-pw' });

      const createArg = usersService.create.mock.calls[0][0];
      expect(createArg.password).not.toBe('plain-pw');
      expect(await bcrypt.compare('plain-pw', createArg.password)).toBe(true);
    });

    it('returns AuthResponseDto without the password and with a JWT', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        password: 'should-not-leak',
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordChangedAt: new Date(),
      });

      const result = await service.register({
        email: 'a@b.c',
        password: 'pw',
      });

      expect(result.accessToken).toBe('jwt-token');
      expect(result.user).toEqual({
        id: 'u1',
        email: 'a@b.c',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(JSON.stringify(result)).not.toContain('should-not-leak');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'a@b.c',
      });
    });
  });

  describe('login', () => {
    it('rejects unknown emails as Unauthorized (not NotFound — no enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@x.y', password: 'pw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects wrong password as Unauthorized', async () => {
      const hash = await bcrypt.hash('correct-pw', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        password: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordChangedAt: new Date(),
      });

      await expect(
        service.login({ email: 'a@b.c', password: 'wrong-pw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns AuthResponseDto on success', async () => {
      const hash = await bcrypt.hash('correct-pw', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        password: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordChangedAt: new Date(),
      });

      const result = await service.login({
        email: 'a@b.c',
        password: 'correct-pw',
      });

      expect(result.user.email).toBe('a@b.c');
      expect(result.accessToken).toBe('jwt-token');
      expect(JSON.stringify(result)).not.toContain(hash);
    });

    it('returns identical Unauthorized message for unknown email vs wrong password', async () => {
      // No user
      usersService.findByEmail.mockResolvedValueOnce(null);
      const err1 = await service
        .login({ email: 'a@b.c', password: 'x' })
        .catch((e) => e);

      // Wrong password
      const hash = await bcrypt.hash('correct', 10);
      usersService.findByEmail.mockResolvedValueOnce({
        id: 'u1',
        email: 'a@b.c',
        password: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordChangedAt: new Date(),
      });
      const err2 = await service
        .login({ email: 'a@b.c', password: 'x' })
        .catch((e) => e);

      expect(err1.message).toBe(err2.message);
    });
  });

  describe('forgotPassword', () => {
    const buildUser = () => ({
      id: 'u1',
      email: 'a@b.c',
      password: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordChangedAt: new Date(),
    });

    it('issues a reset token and emails a link when the user exists', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser() as never);

      await service.forgotPassword('a@b.c');

      expect(authTokens.issue).toHaveBeenCalledWith(
        'u1',
        AuthTokenType.PASSWORD_RESET,
        expect.any(Number),
      );
      expect(mailer.send).toHaveBeenCalledTimes(1);
      const msg = mailer.send.mock.calls[0][0];
      expect(msg.to).toBe('a@b.c');
      expect(msg.text).toContain('opaque-token');
    });

    it('is a silent no-op for an unknown email (no enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.forgotPassword('nobody@x.y'),
      ).resolves.toBeUndefined();

      expect(authTokens.issue).not.toHaveBeenCalled();
      expect(mailer.send).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('consumes a PASSWORD_RESET token and delegates the new password', async () => {
      authTokens.consume.mockResolvedValue('u1');

      await service.resetPassword('the-token', 'NewStrongPass123');

      expect(authTokens.consume).toHaveBeenCalledWith(
        'the-token',
        AuthTokenType.PASSWORD_RESET,
      );
      expect(usersService.resetPassword).toHaveBeenCalledWith(
        'u1',
        'NewStrongPass123',
      );
    });

    it('propagates a bad token and never touches the password', async () => {
      authTokens.consume.mockRejectedValue(new BadRequestException());

      await expect(
        service.resetPassword('bad', 'NewStrongPass123'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersService.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('email verification', () => {
    const buildUser = () => ({
      id: 'u1',
      email: 'a@b.c',
      password: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordChangedAt: new Date(),
    });

    it('requestEmailVerification issues an EMAIL_VERIFY token and emails a link', async () => {
      usersService.findByIdOrThrow.mockResolvedValue(buildUser() as never);

      await service.requestEmailVerification('u1');

      expect(authTokens.issue).toHaveBeenCalledWith(
        'u1',
        AuthTokenType.EMAIL_VERIFY,
        expect.any(Number),
      );
      const msg = mailer.send.mock.calls[0][0];
      expect(msg.to).toBe('a@b.c');
      expect(msg.text).toContain('opaque-token');
    });

    it('verifyEmail consumes the token and marks the email verified', async () => {
      authTokens.consume.mockResolvedValue('u1');

      await service.verifyEmail('the-token');

      expect(authTokens.consume).toHaveBeenCalledWith(
        'the-token',
        AuthTokenType.EMAIL_VERIFY,
      );
      expect(usersService.markEmailVerified).toHaveBeenCalledWith('u1');
    });
  });
});
