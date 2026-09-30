import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CefrLevel } from '@prisma/client';

export class CreateDeckDto {
  @ApiProperty({ example: 'My Travel Words' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ example: 'Words I picked up on my trips abroad.' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: CefrLevel, example: CefrLevel.A2 })
  @IsEnum(CefrLevel)
  @IsOptional()
  level?: CefrLevel;

  @ApiPropertyOptional({ example: ['travel', 'daily life'], maxItems: 10 })
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item: unknown) => String(item).trim().toLocaleLowerCase())
      : value,
  )
  @IsOptional()
  topics?: string[];

  @ApiPropertyOptional({ example: 'Prepare for travel conversations' })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  learningGoal?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Make the deck visible to other users',
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
