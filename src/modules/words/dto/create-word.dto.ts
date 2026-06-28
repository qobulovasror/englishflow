import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateWordDto {
  @ApiProperty({ example: 'serendipity' })
  @IsString()
  word: string;

  @ApiProperty({ example: 'kutilmagan yoqimli kashfiyot' })
  @IsString()
  translation: string;

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
