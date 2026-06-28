import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { DecksService } from '../decks/decks.service';

@Injectable()
export class UsersService {
  private static readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly decksService: DecksService,
  ) {}

  async create(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: dto.password,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const wantsEmailChange = dto.email !== undefined;
    const wantsGoalChange = dto.dailyGoal !== undefined;

    // Nothing to change — return the current row unmodified rather than
    // doing a no-op UPDATE.
    if (!wantsEmailChange && !wantsGoalChange) {
      return this.findByIdOrThrow(id);
    }

    const user = await this.findByIdOrThrow(id);

    // dailyGoal is not security-sensitive, so it can be changed without the
    // current password. Email change is the only field that demands it.
    if (!wantsEmailChange) {
      return this.prisma.user.update({
        where: { id },
        data: { dailyGoal: dto.dailyGoal },
      });
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword ?? '',
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Email unchanged: only a dailyGoal update (if any) remains to apply.
    if (dto.email === user.email) {
      if (wantsGoalChange) {
        return this.prisma.user.update({
          where: { id },
          data: { dailyGoal: dto.dailyGoal },
        });
      }
      return user;
    }

    try {
      // Email change is a security-sensitive event (account recovery uses email).
      // Bump `passwordChangedAt` and revoke refresh tokens so old sessions can't
      // continue under the new identity. Fold in any dailyGoal change too.
      const [updated] = await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id },
          data: {
            email: dto.email,
            passwordChangedAt: new Date(),
            ...(wantsGoalChange ? { dailyGoal: dto.dailyGoal } : {}),
          },
        }),
        this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      ]);
      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  /**
   * Completes (or skips) onboarding: records the chosen level, enrolls the user
   * in the selected decks, and stamps `onboardedAt` so clients stop showing the
   * flow. Enrolling first means an invalid deckId fails before the user is
   * marked onboarded, avoiding a half-finished state.
   */
  async completeOnboarding(id: string, dto: OnboardingDto) {
    await this.findByIdOrThrow(id);

    for (const deckId of dto.deckIds ?? []) {
      await this.decksService.enroll(deckId, id);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        level: dto.level ?? undefined,
        onboardedAt: new Date(),
      },
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findByIdOrThrow(id);

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashed = await bcrypt.hash(dto.newPassword, UsersService.BCRYPT_ROUNDS);

    // Invalidate every existing session for this user:
    //   - bump `passwordChangedAt` so any access token issued before this
    //     moment is rejected by `JwtStrategy.validate`
    //   - delete all refresh tokens so the rotated chain can't be resumed
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { password: hashed, passwordChangedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
    ]);
  }

  /**
   * Sets a new password from the account-recovery flow (no current-password
   * check — the caller already proved ownership by consuming a reset token).
   * Reuses the same invalidation path as `changePassword`: bump
   * `passwordChangedAt` and drop every refresh token so old sessions die.
   */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.findByIdOrThrow(id);

    const hashed = await bcrypt.hash(newPassword, UsersService.BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { password: hashed, passwordChangedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
    ]);
  }

  /** Stamps the email as verified. Idempotent — re-verifying is harmless. */
  async markEmailVerified(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /**
   * Permanently deletes the account after re-verifying the current password.
   * The schema's `onDelete: Cascade` relations remove all owned rows (words,
   * progress, tokens, enrollments, reviews).
   */
  async deleteAccount(id: string, currentPassword: string): Promise<void> {
    const user = await this.findByIdOrThrow(id);

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.prisma.user.delete({ where: { id } });
  }
}
