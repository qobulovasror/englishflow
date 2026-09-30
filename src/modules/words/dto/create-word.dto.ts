import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateWordDto {
  @ApiProperty({ example: 'serendipity' })
  @IsString()
  @MaxLength(200)
  word: string;

  @ApiProperty({ example: 'kutilmagan yoqimli kashfiyot' })
  @IsString()
  @MaxLength(200)
  translation: string;

  @ApiPropertyOptional({ example: '/ˌser.ənˈdɪp.ə.ti/' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  pronunciation?: string;

  @ApiPropertyOptional({ example: 'noun' })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  partOfSpeech?: string;

  @ApiPropertyOptional({ type: [String], example: ['pure serendipity'] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  @IsOptional()
  collocations?: string[];

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
