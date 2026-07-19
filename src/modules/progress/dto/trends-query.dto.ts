import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class TrendsQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 365,
    default: 30,
    description: 'Size of the trailing window in days (ending today, UTC)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;

  @ApiPropertyOptional({
    minimum: -840,
    maximum: 840,
    default: 0,
    description:
      'Client timezone offset in minutes east of UTC (-new Date().getTimezoneOffset()). ' +
      'Buckets days by local calendar date; defaults to UTC.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(-840)
  @Max(840)
  tzOffsetMinutes?: number;
}
