import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CefrLevel } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: '8c5f4e64-1c39-4a55-9c8e-1e1b9c41a0a2', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'student@example.com', format: 'email' })
  @Expose()
  email: string;

  @ApiPropertyOptional({ enum: CefrLevel, example: CefrLevel.A2, nullable: true })
  @Expose()
  level?: CefrLevel | null;

  @ApiPropertyOptional({
    format: 'date-time',
    nullable: true,
    description: 'Null until the user completes or skips onboarding',
  })
  @Expose()
  onboardedAt?: Date | null;

  @ApiProperty({ example: '2026-05-11T12:00:00.000Z', format: 'date-time' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-05-11T12:00:00.000Z', format: 'date-time' })
  @Expose()
  updatedAt: Date;
}
