import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { UpdateDeckDto } from './update-deck.dto';

export class AdminUpdateDeckDto extends UpdateDeckDto {
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100,
    description: 'Curator-assigned content quality score',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  qualityScore?: number;
}
