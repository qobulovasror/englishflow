import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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

  @ApiPropertyOptional({
    default: false,
    description: 'Make the deck visible to other users',
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
