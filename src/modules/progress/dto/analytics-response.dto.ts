import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CefrLevel, WordStatus } from '@prisma/client';

export class TrendPointDto {
  @ApiProperty({ example: '2026-06-29', description: 'UTC calendar day' })
  @Expose()
  date: string;

  @ApiProperty({ example: 12, description: 'Reviews completed on this day' })
  @Expose()
  count: number;
}

export class DeckProgressDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Travel Essentials' })
  @Expose()
  title: string;

  @ApiProperty({ enum: CefrLevel, nullable: true, example: 'A2' })
  @Expose()
  level: CefrLevel | null;

  @ApiProperty({ example: true, description: 'Curated system deck' })
  @Expose()
  isSystem: boolean;

  @ApiProperty({ example: 40, description: "Words in the deck the user is tracking" })
  @Expose()
  total: number;

  @ApiProperty({ example: 10 })
  @Expose()
  new: number;

  @ApiProperty({ example: 22 })
  @Expose()
  learning: number;

  @ApiProperty({ example: 8 })
  @Expose()
  learned: number;

  @ApiProperty({ example: 20, description: 'Percentage of learned words (0–100)' })
  @Expose()
  progressPercentage: number;
}

export class LeechWordDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  wordId: string;

  @ApiProperty({ example: 'ubiquitous' })
  @Expose()
  word: string;

  @ApiProperty({ example: 'hamma joyda mavjud' })
  @Expose()
  translation: string;

  @ApiProperty({ example: 6, description: 'Times the card was failed after graduating' })
  @Expose()
  lapses: number;

  @ApiProperty({ enum: WordStatus })
  @Expose()
  status: WordStatus;

  @ApiProperty({ format: 'date-time', nullable: true })
  @Expose()
  lastReviewedAt: Date | null;
}
