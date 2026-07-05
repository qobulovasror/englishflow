import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ApiSuccessResponse } from '../../../common/swagger/api-response.decorator';
import { AdminService } from '../admin.service';
import {
  AdminStatsOverviewDto,
  SignupPointDto,
} from '../dto/admin-stats-response.dto';
import { SignupsQueryDto } from '../dto/signups-query.dto';

/**
 * Read-only platform metrics for the admin dashboard. Every route requires the
 * ADMIN role: `JwtAuthGuard` authenticates, then `RolesGuard` checks
 * `@Roles(Role.ADMIN)`.
 */
@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/stats')
export class AdminDashboardController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Aggregate platform metrics (admin)' })
  @ApiSuccessResponse(AdminStatsOverviewDto, {
    description: 'Overview counts for users, decks, words, reviews and tests',
  })
  overview(): Promise<AdminStatsOverviewDto> {
    return this.adminService.overview();
  }

  @Get('signups')
  @ApiOperation({ summary: 'Daily signup trend (admin)' })
  @ApiSuccessResponse(SignupPointDto, {
    isArray: true,
    description: 'Dense daily signup series, oldest→newest',
  })
  signups(@Query() query: SignupsQueryDto): Promise<SignupPointDto[]> {
    return this.adminService.signups(query.days);
  }
}
