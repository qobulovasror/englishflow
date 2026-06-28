import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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

export class AddDeckWordsDto {
  @ApiProperty({ type: [DeckWordItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeckWordItemDto)
  words: DeckWordItemDto[];
}
