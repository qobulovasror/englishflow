import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ProgressQueryDto {
  @ApiPropertyOptional({
    minimum: -840,
    maximum: 840,
    default: 0,
    description:
      'Client timezone offset in minutes east of UTC (-new Date().getTimezoneOffset()). ' +
      'Buckets the streak and daily goal by local calendar date; defaults to UTC.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(-840)
  @Max(840)
  tzOffsetMinutes?: number;
}
