import { IsString, IsOptional } from 'class-validator';

export class CreateWordDto {
  @IsString()
  word: string;

  @IsString()
  translation: string;

  @IsString()
  @IsOptional()
  example?: string;
}
