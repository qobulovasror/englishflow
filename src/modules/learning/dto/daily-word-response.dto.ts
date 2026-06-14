import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { WordStatus } from '@prisma/client';

export class DailyWordResponseDto {
  @ApiProperty({ format: 'uuid', description: 'UserWord id (use in /learning/review)' })
  @Expose()
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Expose()
  wordId: string;

  @ApiProperty({ example: 'serendipity' })
  @Expose()
  word: string;

  @ApiProperty({ example: 'kutilmagan yoqimli kashfiyot' })
  @Expose()
  translation: string;

  @ApiPropertyOptional()
  @Expose()
  example?: string | null;

  @ApiProperty({ enum: WordStatus, example: WordStatus.NEW })
  @Expose()
  status: WordStatus;

  @ApiProperty({ example: 0 })
  @Expose()
  repetitionCount: number;
}

export class ReviewResultDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'serendipity' })
  @Expose()
  word: string;

  @ApiProperty({ enum: WordStatus, example: WordStatus.LEARNING })
  @Expose()
  status: WordStatus;

  @ApiProperty({ example: 3 })
  @Expose()
  repetitionCount: number;

  @ApiProperty({ example: 6, description: 'Days until the next scheduled review' })
  @Expose()
  interval: number;

  @ApiProperty({
    format: 'date-time',
    description: 'When this word is next due for review',
  })
  @Expose()
  nextReviewAt: Date;
}
