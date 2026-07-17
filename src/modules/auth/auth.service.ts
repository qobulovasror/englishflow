import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { AuthTokenType, User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { RefreshTokensService } from './refresh-tokens.service';
import { AuthTokensService } from './auth-tokens.service';
import { MailerService } from '../../common/mailer/mailer.service';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class AuthService {
  private static readonly BCRYPT_ROUNDS = 12;
  // Bcrypt hash of an unguessable random string; used to keep the timing of a
  // missing-user login indistinguishable from a wrong-password login. The
  // computed value is thrown away — its only purpose is to consume the same
  // ~CPU as a real `bcrypt.compare` would.
  private static readonly DUMMY_HASH =
    '$2b$12$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUVWX';

  // Token lifetimes: a reset link is short-lived; verification can wait a day.
  private static readonly PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
  private static readonly EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokens: RefreshTokensService,
    private readonly authTokens: AuthTokensService,
    private readonly mailer: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      AuthService.BCRYPT_ROUNDS,
    );
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

  /**
   * Starts the password-reset flow. ALWAYS resolves without revealing whether
   * the email is registered — only sends a reset link when it actually is, so
   * the endpoint can't be used to enumerate accounts.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return;
    }

    const { token } = await this.authTokens.issue(
      user.id,
      AuthTokenType.PASSWORD_RESET,
      AuthService.PASSWORD_RESET_TTL_MS,
    );

    const link = `${this.frontendUrl()}/reset-password?token=${token}`;
    await this.mailer.send({
      to: user.email,
      subject: 'Reset your EnglishFlow password',
      text:
        `We received a request to reset your password.\n\n` +
        `Reset it here (valid for 1 hour): ${link}\n\n` +
        `If you didn't request this, you can safely ignore this email.`,
    });
  }

  /**
   * Completes the password-reset flow: spends the token and sets a new
   * password (which also invalidates every existing session). An invalid,
   * expired, or already-used token surfaces as a 400.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.authTokens.consume(
      token,
      AuthTokenType.PASSWORD_RESET,
    );
    await this.usersService.resetPassword(userId, newPassword);
  }

  /** Sends an email-verification link to the authenticated user. */
  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.usersService.findByIdOrThrow(userId);

    const { token } = await this.authTokens.issue(
      user.id,
      AuthTokenType.EMAIL_VERIFY,
      AuthService.EMAIL_VERIFY_TTL_MS,
    );

    const link = `${this.frontendUrl()}/verify-email?token=${token}`;
    await this.mailer.send({
      to: user.email,
      subject: 'Verify your EnglishFlow email',
      text:
        `Confirm your email address to finish securing your account.\n\n` +
        `Verify here (valid for 24 hours): ${link}`,
    });
  }

  /** Completes email verification by spending an EMAIL_VERIFY token. */
  async verifyEmail(token: string): Promise<void> {
    const userId = await this.authTokens.consume(
      token,
      AuthTokenType.EMAIL_VERIFY,
    );
    await this.usersService.markEmailVerified(userId);
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

  private frontendUrl(): string {
    return this.configService.getOrThrow<AppConfig>('app').frontendUrl;
  }
}
