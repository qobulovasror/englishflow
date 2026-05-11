import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { ProgressResponseDto } from './dto/progress-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';

@ApiTags('Progress')
@ApiBearerAuth('JWT')
@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @ApiOperation({ summary: 'Get vocabulary and test statistics for the current user' })
  @ApiSuccessResponse(ProgressResponseDto)
  getProgress(@CurrentUser() user: { id: string }) {
    return this.progressService.getUserProgress(user.id);
  }
}
