import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LearningService } from './learning.service';
import { ReviewWordDto } from './dto/review-word.dto';
import {
  DailyWordResponseDto,
  ReviewResultDto,
} from './dto/daily-word-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../common/swagger/api-error-response.dto';

@ApiTags('Learning')
@ApiBearerAuth('JWT')
@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Get today\'s words to review (spaced repetition)' })
  @ApiSuccessResponse(DailyWordResponseDto, { isArray: true })
  getDailyWords(@CurrentUser() user: { id: string }) {
    return this.learningService.getDailyWords(user.id);
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
  reviewWord(
    @Body() dto: ReviewWordDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.learningService.reviewWord(dto, user.id);
  }
}
