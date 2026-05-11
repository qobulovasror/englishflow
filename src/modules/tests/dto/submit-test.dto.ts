import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsString, ValidateNested } from 'class-validator';

export class TestAnswerDto {
  @ApiProperty({
    example: 'b2c1a0d3-5e4f-6789-abcd-ef0123456789',
    format: 'uuid',
  })
  @IsString()
  wordId: string;

  @ApiProperty({ example: 'kutilmagan yoqimli kashfiyot' })
  @IsString()
  selectedAnswer: string;
}

export class SubmitTestDto {
  @ApiProperty({ type: [TestAnswerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TestAnswerDto)
  answers: TestAnswerDto[];
}
