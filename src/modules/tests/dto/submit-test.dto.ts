import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsString()
  wordId: string;

  @IsString()
  selectedAnswer: string;
}

export class SubmitTestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
