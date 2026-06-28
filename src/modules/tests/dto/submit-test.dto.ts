import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class TestAnswerDto {
  @ApiProperty({
    example: 'b2c1a0d3-5e4f-6789-abcd-ef0123456789',
    format: 'uuid',
  })
  @IsUUID()
  wordId: string;

  @ApiProperty({ example: 'kutilmagan yoqimli kashfiyot' })
  @IsString()
  selectedAnswer: string;
}

export class SubmitTestDto {
  @ApiProperty({
    example: 'a1b2c3d4-5e6f-7890-abcd-ef0123456789',
    format: 'uuid',
    description: 'The id returned by POST /tests/start',
  })
  @IsUUID()
  testId: string;

  @ApiProperty({ type: [TestAnswerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TestAnswerDto)
  answers: TestAnswerDto[];
}
