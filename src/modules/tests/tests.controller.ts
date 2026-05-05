import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TestsService } from './tests.service';
import { SubmitTestDto } from './dto/submit-test.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('tests')
@UseGuards(JwtAuthGuard)
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post('start')
  async startTest(@CurrentUser() user: { id: string }) {
    return this.testsService.startTest(user.id);
  }

  @Post('submit')
  async submitTest(@Body() dto: SubmitTestDto, @CurrentUser() user: { id: string }) {
    return this.testsService.submitTest(dto, user.id);
  }
}
