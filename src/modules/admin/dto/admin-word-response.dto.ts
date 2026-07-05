import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** Admin-facing word row: includes ownership/deck context absent from the public DTO. */
export class AdminWordResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'serendipity' })
  @Expose()
  word: string;

  @ApiProperty({ example: 'kutilmagan yoqimli kashfiyot' })
  @Expose()
  translation: string;

  @ApiPropertyOptional({ example: 'Finding that book was pure serendipity.' })
  @Expose()
  example?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/audio/serendipity.mp3' })
  @Expose()
  audioUrl?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Expose()
  deckId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Title of the deck the word belongs to' })
  @Expose()
  deckTitle?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Owner id; null for curated/system words',
  })
  @Expose()
  createdById?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Owner email; null for system words' })
  @Expose()
  ownerEmail?: string | null;

  @ApiProperty({ description: 'True when the word has no individual owner' })
  @Expose()
  isSystem: boolean;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  updatedAt: Date;
}
