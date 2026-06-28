import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateWordDto {
  @ApiPropertyOptional({ example: 'serendipity' })
  @IsString()
  @IsOptional()
  word?: string;

  @ApiPropertyOptional({ example: 'kutilmagan yoqimli kashfiyot' })
  @IsString()
  @IsOptional()
  translation?: string;

  @ApiPropertyOptional({
    example: 'Finding that book was pure serendipity.',
  })
  @IsString()
  @IsOptional()
  example?: string;
}
