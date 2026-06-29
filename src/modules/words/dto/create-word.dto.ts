import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateWordDto {
  @ApiProperty({ example: 'serendipity' })
  @IsString()
  @MaxLength(200)
  word: string;

  @ApiProperty({ example: 'kutilmagan yoqimli kashfiyot' })
  @IsString()
  @MaxLength(200)
  translation: string;

  @ApiPropertyOptional({
    example: 'Finding that book was pure serendipity.',
  })
  @IsString()
  @MaxLength(1000)
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
