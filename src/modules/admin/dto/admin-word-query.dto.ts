import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AdminWordQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive search across word and translation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by deck' })
  @IsOptional()
  @IsUUID()
  deckId?: string;
}
