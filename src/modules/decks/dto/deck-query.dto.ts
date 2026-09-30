import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CefrLevel } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class DeckQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CefrLevel, description: 'Filter by CEFR level' })
  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;

  @ApiPropertyOptional({ description: 'Case-insensitive title search' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 'travel', description: 'Exact topic tag' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  topic?: string;

  @ApiPropertyOptional({ example: 'Prepare for travel conversations' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  learningGoal?: string;

  @ApiPropertyOptional({
    enum: ['popular', 'newest', 'title', 'content', 'quality'],
  })
  @IsOptional()
  @IsIn(['popular', 'newest', 'title', 'content', 'quality'])
  sort?: 'popular' | 'newest' | 'title' | 'content' | 'quality';
}
