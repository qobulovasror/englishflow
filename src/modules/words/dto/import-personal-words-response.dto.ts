import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ImportPersonalWordsResponseDto {
  @ApiProperty({ example: 18 })
  @Expose()
  importedCount: number;

  @ApiProperty({ example: 2 })
  @Expose()
  duplicateCount: number;
}
