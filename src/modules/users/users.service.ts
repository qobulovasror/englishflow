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

@Injectable()
export class UsersService {
  private static readonly BCRYPT_ROUNDS = 12;

  constructor(private readonly prisma: PrismaService) {}

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
    // Nothing to change — return the current row unmodified rather than
    // doing a no-op UPDATE.
    if (dto.email === undefined) {
      return this.findByIdOrThrow(id);
    }

    const user = await this.findByIdOrThrow(id);
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.email === user.email) {
      return user;
    }

    try {
      // Email change is a security-sensitive event (account recovery uses email).
      // Bump `passwordChangedAt` and revoke refresh tokens so old sessions can't
      // continue under the new identity.
      const [updated] = await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id },
          data: { email: dto.email, passwordChangedAt: new Date() },
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
}
