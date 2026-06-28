import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class TestQuestionDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  wordId: string;

  @ApiProperty({ example: 'serendipity' })
  @Expose()
  word: string;

  @ApiProperty({ type: [String], example: ['kutilmagan yoqimli kashfiyot', 'jadval', 'iqtisodiy', 'lazzat'] })
  @Expose()
  options: string[];
}

export class StartTestResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Pass this back to POST /tests/submit when finished',
  })
  @Expose()
  testId: string;

  @ApiProperty({ type: [TestQuestionDto] })
  @Expose()
  @Type(() => TestQuestionDto)
  questions: TestQuestionDto[];
}

export class TestQuestionResultDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Expose()
  wordId: string;

  @ApiProperty({ nullable: true, description: 'Null if the question was left unanswered' })
  @Expose()
  selectedAnswer: string | null;

  @ApiProperty()
  @Expose()
  correctAnswer: string;
}

export class SubmitTestResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  testId: string;

  @ApiProperty({ example: 4 })
  @Expose()
  score: number;

  @ApiProperty({ example: 5 })
  @Expose()
  total: number;

  @ApiProperty({ example: 80 })
  @Expose()
  percentage: number;

  @ApiProperty({ type: [TestQuestionResultDto] })
  @Expose()
  @Type(() => TestQuestionResultDto)
  questions: TestQuestionResultDto[];
}
