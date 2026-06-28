import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CefrLevel } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class OnboardingDto {
  @ApiPropertyOptional({ enum: CefrLevel, description: 'Self-reported level' })
  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Decks to enroll in. May be empty when the user skips.',
    example: ['11111111-1111-1111-1111-111111111111'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  deckIds?: string[];
}
