import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../common/swagger/api-error-response.dto';

@ApiTags('Tests')
@ApiBearerAuth('JWT')
@Controller('tests')
@UseGuards(JwtAuthGuard)
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a new quiz from the user vocabulary' })
  @ApiSuccessResponse(StartTestResponseDto)
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Not enough words to start a test',
    type: ApiErrorResponseDto,
  })
  startTest(@CurrentUser() user: { id: string }) {
    return this.testsService.startTest(user.id);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a completed quiz and receive the result' })
  @ApiSuccessResponse(SubmitTestResponseDto)
  submitTest(
    @Body() dto: SubmitTestDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.testsService.submitTest(dto, user.id);
  }
}
