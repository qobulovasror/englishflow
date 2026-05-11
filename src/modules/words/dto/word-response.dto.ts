import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class WordResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'serendipity' })
  @Expose()
  word: string;

  @ApiProperty({ example: 'kutilmagan yoqimli kashfiyot' })
  @Expose()
  translation: string;

  @ApiPropertyOptional({ example: 'Finding that book was pure serendipity.' })
  @Expose()
  example?: string | null;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  updatedAt: Date;
}
