import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LearningService } from './learning.service';
import { ReviewWordDto } from './dto/review-word.dto';
import {
  DailyWordResponseDto,
  ReviewResultDto,
} from './dto/daily-word-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../common/swagger/api-error-response.dto';

@ApiTags('Learning')
@ApiBearerAuth('JWT')
@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('daily')
  @ApiOperation({ summary: "Get today's words to review (spaced repetition)" })
  @ApiQuery({
    name: 'tzOffsetMinutes',
    required: false,
    schema: { type: 'number', minimum: -840, maximum: 840 },
    description:
      'Minutes east of UTC for the learner’s local day (−840 to 840).',
  })
  @ApiSuccessResponse(DailyWordResponseDto, { isArray: true })
  getDailyWords(
    @CurrentUser() user: { id: string },
    @Query('tzOffsetMinutes') tzOffset?: string,
  ) {
    const parsedOffset = tzOffset === undefined ? 0 : Number(tzOffset);
    return this.learningService.getDailyWords(
      user.id,
      Number.isFinite(parsedOffset) ? parsedOffset : 0,
    );
  }

  @Post('review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a review for a word' })
  @ApiSuccessResponse(ReviewResultDto)
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'UserWord does not exist or does not belong to user',
    type: ApiErrorResponseDto,
  })
  reviewWord(@Body() dto: ReviewWordDto, @CurrentUser() user: { id: string }) {
    return this.learningService.reviewWord(dto, user.id);
  }
}
