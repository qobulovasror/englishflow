import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateWordDto } from '../../words/dto/create-word.dto';

/**
 * Admin word creation. Reuses the public {@link CreateWordDto} validation and
 * adds an optional `deckId` so a curated word can be attached to a deck. The
 * created word has no individual owner (`createdById: null`).
 */
export class CreateAdminWordDto extends CreateWordDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Attach the word to this deck (optional)',
  })
  @IsOptional()
  @IsUUID()
  deckId?: string;
}
