import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshTokensService } from './refresh-tokens.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let refreshTokens: jest.Mocked<RefreshTokensService>;

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
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'jwt-token') },
        },
        {
          provide: RefreshTokensService,
          useValue: {
            issue: jest
              .fn()
              .mockResolvedValue({ token: 'refresh-token', expiresAt: new Date() }),
            rotate: jest.fn(),
            revoke: jest.fn(),
            revokeAllForUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    refreshTokens = module.get(RefreshTokensService);
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
});
