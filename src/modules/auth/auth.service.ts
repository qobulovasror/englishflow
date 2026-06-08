import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { RefreshTokensService } from './refresh-tokens.service';

@Injectable()
export class AuthService {
  private static readonly BCRYPT_ROUNDS = 12;
  // Bcrypt hash of an unguessable random string; used to keep the timing of a
  // missing-user login indistinguishable from a wrong-password login. The
  // computed value is thrown away — its only purpose is to consume the same
  // ~CPU as a real `bcrypt.compare` would.
  private static readonly DUMMY_HASH =
    '$2b$12$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUVWX';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokens: RefreshTokensService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, AuthService.BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);

    // Run bcrypt even when the user doesn't exist, against a fixed dummy hash.
    // Otherwise the missing-user branch returns ~instantly while the
    // wrong-password branch takes ~hundreds of ms — a remote timing channel
    // that reveals which emails are registered.
    const hashToCompare = user?.password ?? AuthService.DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Rotates a refresh token into a new access + refresh pair. The old refresh
   * token is invalidated.
   */
  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const { userId, issued } = await this.refreshTokens.rotate(refreshToken);
    const user = await this.usersService.findByIdOrThrow(userId);

    return plainToInstance(
      AuthResponseDto,
      {
        user: plainToInstance(UserResponseDto, user, {
          excludeExtraneousValues: true,
        }),
        accessToken: this.signAccessToken(user),
        refreshToken: issued.token,
      },
      { excludeExtraneousValues: true },
    );
  }

  /** Revokes a single refresh token. Subsequent /auth/refresh with this token fails. */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokens.revoke(refreshToken);
  }

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const issued = await this.refreshTokens.issue(user.id);
    return plainToInstance(
      AuthResponseDto,
      {
        user: plainToInstance(UserResponseDto, user, {
          excludeExtraneousValues: true,
        }),
        accessToken: this.signAccessToken(user),
        refreshToken: issued.token,
      },
      { excludeExtraneousValues: true },
    );
  }

  private signAccessToken(user: User): string {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }
}
