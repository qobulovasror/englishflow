import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CefrLevel } from '@prisma/client';
import { WordResponseDto } from '../../words/dto/word-response.dto';

/**
 * Admin-facing deck row. Unlike {@link DeckResponseDto} (which is scoped to the
 * requesting user), this exposes ownership context for ANY deck — system or
 * user-owned — for the admin management table.
 */
export class AdminDeckRowDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Travel Essentials' })
  @Expose()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  description?: string | null;

  @ApiPropertyOptional({ enum: CefrLevel, nullable: true })
  @Expose()
  level?: CefrLevel | null;

  @ApiProperty({ description: 'True for curated decks shipped with the app' })
  @Expose()
  isSystem: boolean;

  @ApiProperty({
    description: 'Public visibility. Always false for system decks.',
  })
  @Expose()
  isPublic: boolean;

  @ApiProperty({ example: 40 })
  @Expose()
  wordCount: number;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Owner id; null for system decks',
  })
  @Expose()
  createdById?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Owner email; null for system decks',
  })
  @Expose()
  ownerEmail?: string | null;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  updatedAt: Date;
}

export class AdminDeckDetailDto extends AdminDeckRowDto {
  @ApiProperty({ type: [WordResponseDto] })
  @Expose()
  @Type(() => WordResponseDto)
  words: WordResponseDto[];
}
