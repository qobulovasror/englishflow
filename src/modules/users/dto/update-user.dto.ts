import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsTimeZone,
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
    example: 10,
    minimum: 1,
    maximum: 50,
    description: 'Maximum new words introduced per local day (1–50).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  dailyNewLimit?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @ApiPropertyOptional({ example: 19, minimum: 0, maximum: 23 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  reminderHour?: number;

  @ApiPropertyOptional({ example: 30, minimum: 0, maximum: 59 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  reminderMinute?: number;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5], maxItems: 7 })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  reminderDays?: number[];

  @ApiPropertyOptional({ example: 'Asia/Tashkent' })
  @IsOptional()
  @IsTimeZone()
  reminderTimezone?: string;

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
