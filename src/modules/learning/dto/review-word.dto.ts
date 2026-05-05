import { IsString, IsBoolean } from 'class-validator';

export class ReviewWordDto {
  @IsString()
  userWordId: string;

  @IsBoolean()
  correct: boolean;
}
