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

  @ApiProperty()
  @Expose()
  selectedAnswer: string;

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
