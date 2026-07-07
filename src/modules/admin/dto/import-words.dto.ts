import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { DeckWordItemDto } from '../../decks/dto/add-deck-words.dto';

/**
 * Bulk word import (admin). Reuses {@link DeckWordItemDto} for per-row validation
 * (word/translation required, optional example + audioUrl). The client parses the
 * uploaded CSV/JSON file and posts the rows here, chunked to stay under the JSON
 * body limit. `deckId` is optional: when set, every imported word is attached to
 * that deck; when omitted the words are created as standalone curated content
 * (`deckId: null`, `createdById: null`).
 */
export class ImportWordsDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Attach every imported word to this deck. Omit for standalone curated words.',
  })
  @IsOptional()
  @IsUUID()
  deckId?: string;

  @ApiProperty({ type: [DeckWordItemDto], description: 'Parsed rows to import' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => DeckWordItemDto)
  words: DeckWordItemDto[];
}
