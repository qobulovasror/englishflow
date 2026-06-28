import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
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
}

export class AddDeckWordsDto {
  @ApiProperty({ type: [DeckWordItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeckWordItemDto)
  words: DeckWordItemDto[];
}
