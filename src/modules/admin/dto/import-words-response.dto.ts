import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** Summary returned after a bulk word import. */
export class ImportWordsResultDto {
  @ApiProperty({ example: 'Imported 42 words, skipped 8 duplicates' })
  @Expose()
  message: string;

  @ApiProperty({ example: 50, description: 'Rows received in this request' })
  @Expose()
  received: number;

  @ApiProperty({ example: 42, description: 'New words inserted' })
  @Expose()
  imported: number;

  @ApiProperty({
    example: 8,
    description: 'Rows skipped as duplicates (already present in the same scope)',
  })
  @Expose()
  skipped: number;
}
