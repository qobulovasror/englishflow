import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { ProgressResponseDto } from './dto/progress-response.dto';
import { TrendsQueryDto } from './dto/trends-query.dto';
import {
  DeckProgressDto,
  LeechWordDto,
  TrendPointDto,
} from './dto/analytics-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';

@ApiTags('Progress')
@ApiBearerAuth('JWT')
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @ApiOperation({ summary: 'Get vocabulary and test statistics for the current user' })
  @ApiSuccessResponse(ProgressResponseDto)
  getProgress(@CurrentUser() user: { id: string }) {
    return this.progressService.getUserProgress(user.id);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Daily review activity over a trailing window (zero-filled)' })
  @ApiSuccessResponse(TrendPointDto, { isArray: true })
  getTrends(
    @CurrentUser() user: { id: string },
    @Query() query: TrendsQueryDto,
  ) {
    return this.progressService.getTrends(user.id, query.days ?? 30);
  }

  @Get('decks')
  @ApiOperation({ summary: 'Per-deck learning progress for joined/created decks' })
  @ApiSuccessResponse(DeckProgressDto, { isArray: true })
  getDeckProgress(@CurrentUser() user: { id: string }) {
    return this.progressService.getDeckProgress(user.id);
  }

  @Get('leeches')
  @ApiOperation({ summary: 'Troublesome words with a high lapse count' })
  @ApiSuccessResponse(LeechWordDto, { isArray: true })
  getLeeches(@CurrentUser() user: { id: string }) {
    return this.progressService.getLeeches(user.id);
  }
}
