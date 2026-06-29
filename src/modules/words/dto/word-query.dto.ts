import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { WordStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class WordQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: WordStatus,
    description: 'Filter by the learning status of the word',
  })
  @IsOptional()
  @IsEnum(WordStatus)
  status?: WordStatus;
}
