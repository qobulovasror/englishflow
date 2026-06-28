import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CefrLevel } from '@prisma/client';
import { WordResponseDto } from '../../words/dto/word-response.dto';

export class DeckResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Travel Essentials' })
  @Expose()
  title: string;

  @ApiPropertyOptional({ example: 'Words you need for getting around abroad.' })
  @Expose()
  description?: string | null;

  @ApiPropertyOptional({ enum: CefrLevel, example: CefrLevel.A2 })
  @Expose()
  level?: CefrLevel | null;

  @ApiProperty({ description: 'True for curated decks shipped with the app' })
  @Expose()
  isSystem: boolean;

  @ApiProperty({ example: 40, description: 'Number of words in the deck' })
  @Expose()
  wordCount: number;

  @ApiProperty({ description: 'Whether the current user has joined this deck' })
  @Expose()
  isEnrolled: boolean;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  createdAt: Date;
}

export class DeckDetailResponseDto extends DeckResponseDto {
  @ApiProperty({ type: [WordResponseDto] })
  @Expose()
  @Type(() => WordResponseDto)
  words: WordResponseDto[];
}

export class EnrollResponseDto {
  @ApiProperty({ example: 'Enrolled in "Travel Essentials"' })
  @Expose()
  message: string;

  @ApiProperty({ example: 40, description: 'Words now in your learning list' })
  @Expose()
  enrolledCount: number;
}

export class AddDeckWordsResponseDto {
  @ApiProperty({ example: 'Added 3 words to "My Travel Words"' })
  @Expose()
  message: string;

  @ApiProperty({ example: 3, description: 'Words added by this request' })
  @Expose()
  addedCount: number;

  @ApiProperty({ example: 12, description: 'Total words in the deck now' })
  @Expose()
  wordCount: number;
}
