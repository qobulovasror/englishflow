import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { LearningService } from './learning.service';
import { ReviewWordDto } from './dto/review-word.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('daily')
  async getDailyWords(@CurrentUser() user: { id: string }) {
    return this.learningService.getDailyWords(user.id);
  }

  @Post('review')
  async reviewWord(@Body() dto: ReviewWordDto, @CurrentUser() user: { id: string }) {
    return this.learningService.reviewWord(dto, user.id);
  }
}
