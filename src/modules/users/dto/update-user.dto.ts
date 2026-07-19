import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'new-email@example.com',
    description: 'New email address. Must be unique.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 200,
    description:
      'Daily review goal (1–200). Editable without the current password.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  dailyGoal?: number;

  @ApiPropertyOptional({
    example: 'CurrentPass123!',
    description:
      'The current password — required only when changing email, to prevent ' +
      'account takeover via stolen access tokens. Not needed for other updates ' +
      '(e.g. dailyGoal).',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;
}
