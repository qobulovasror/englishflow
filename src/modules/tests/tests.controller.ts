import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { QuizMode } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TestsService } from './tests.service';
import { SubmitTestDto } from './dto/submit-test.dto';
import {
  StartTestResponseDto,
  SubmitTestResponseDto,
} from './dto/test-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../common/swagger/api-error-response.dto';

@ApiTags('Tests')
@ApiBearerAuth('JWT')
@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a new quiz from the user vocabulary' })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: QuizMode,
    description: 'Quiz exercise style; defaults to FORWARD',
  })
  @ApiSuccessResponse(StartTestResponseDto)
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Not enough words to start a test',
    type: ApiErrorResponseDto,
  })
  startTest(@CurrentUser() user: { id: string }, @Query('mode') mode?: string) {
    if (mode && !Object.values(QuizMode).includes(mode as QuizMode)) {
      throw new BadRequestException('Unsupported quiz mode');
    }
    return this.testsService.startTest(user.id, mode as QuizMode | undefined);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a completed quiz and receive the result' })
  @ApiSuccessResponse(SubmitTestResponseDto)
  submitTest(@Body() dto: SubmitTestDto, @CurrentUser() user: { id: string }) {
    return this.testsService.submitTest(dto, user.id);
  }
}
