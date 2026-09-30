import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class DeckWordItemDto {
  @ApiProperty({ example: 'serendipity' })
  @IsString()
  @MaxLength(200)
  word: string;

  @ApiProperty({ example: 'kutilmagan yoqimli kashfiyot' })
  @IsString()
  @MaxLength(200)
  translation: string;

  @ApiPropertyOptional({ example: '/ˈwɝːd/' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  pronunciation?: string;

  @ApiPropertyOptional({ example: 'noun' })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  partOfSpeech?: string;

  @ApiPropertyOptional({ type: [String] })
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

export class AddDeckWordsDto {
  @ApiProperty({ type: [DeckWordItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DeckWordItemDto)
  words: DeckWordItemDto[];
}
