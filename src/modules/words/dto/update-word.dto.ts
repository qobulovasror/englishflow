import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

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

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/audio/serendipity.mp3',
  })
  @IsUrl()
  @MaxLength(2048)
  @IsOptional()
  audioUrl?: string;
}
