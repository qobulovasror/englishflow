import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CefrLevel, Role } from '@prisma/client';

/** Per-user relation tallies surfaced to the admin (never the password hash). */
export class AdminUserCountsDto {
  @ApiProperty({ example: 12, description: 'Words created by the user' })
  @Expose()
  words: number;

  @ApiProperty({ example: 3, description: 'Decks the user owns' })
  @Expose()
  decks: number;

  @ApiProperty({ example: 5, description: 'Decks the user has joined' })
  @Expose()
  enrollments: number;

  @ApiProperty({ example: 240, description: 'Grading actions logged' })
  @Expose()
  reviews: number;

  @ApiProperty({ example: 8, description: 'Tests taken' })
  @Expose()
  tests: number;
}

/**
 * Admin-facing view of a user. Deliberately omits the password hash and
 * `passwordChangedAt`; only fields an admin needs to see are exposed.
 */
export class AdminUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ format: 'email', example: 'student@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @Expose()
  role: Role;

  @ApiPropertyOptional({ enum: CefrLevel, nullable: true })
  @Expose()
  level?: CefrLevel | null;

  @ApiProperty({ example: 20, description: 'Daily review goal (1–200)' })
  @Expose()
  dailyGoal: number;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @Expose()
  onboardedAt?: Date | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @Expose()
  emailVerifiedAt?: Date | null;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ type: AdminUserCountsDto })
  @Expose()
  @Type(() => AdminUserCountsDto)
  counts: AdminUserCountsDto;
}
