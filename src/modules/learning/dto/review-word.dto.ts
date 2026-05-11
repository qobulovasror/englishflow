import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class ReviewWordDto {
  @ApiProperty({
    example: '7a1e0b8f-9c12-4d3a-b8e7-65b1d3c9c2f4',
    format: 'uuid',
    description: 'ID of the UserWord (not the Word itself)',
  })
  @IsString()
  userWordId: string;

  @ApiProperty({
    example: true,
    description: 'Whether the user answered correctly',
  })
  @IsBoolean()
  correct: boolean;
}
