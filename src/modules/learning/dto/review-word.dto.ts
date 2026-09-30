import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Rating } from '../../../common/utils/sm2';

export class ReviewWordDto {
  @ApiProperty({
    example: '7a1e0b8f-9c12-4d3a-b8e7-65b1d3c9c2f4',
    format: 'uuid',
    description: 'ID of the UserWord (not the Word itself)',
  })
  @IsString()
  userWordId: string;

  @ApiProperty({
    enum: Rating,
    example: Rating.GOOD,
    description:
      'Recall quality. AGAIN = failed (re-learn), HARD/GOOD/EASY = successful recall feeding the SM-2 schedule.',
  })
  @IsEnum(Rating)
  rating: Rating;

  @ApiProperty({
    required: false,
    format: 'uuid',
    description: 'Unique client review id, used to safely retry offline sync.',
  })
  @IsOptional()
  @IsUUID()
  requestId?: string;
}
