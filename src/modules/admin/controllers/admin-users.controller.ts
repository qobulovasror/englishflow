import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  ApiSuccessPrimitiveResponse,
} from '../../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../../common/swagger/api-error-response.dto';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { AdminService } from '../admin.service';
import { AdminUserQueryDto } from '../dto/admin-user-query.dto';
import { AdminUserResponseDto } from '../dto/admin-user-response.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

/** User administration. ADMIN-only (JwtAuthGuard + RolesGuard). */
@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({
    summary: 'List users with search, role filter and paging (admin)',
  })
  @ApiPaginatedResponse(AdminUserResponseDto, { description: 'Page of users' })
  list(
    @Query() query: AdminUserQueryDto,
  ): Promise<PaginatedResponseDto<AdminUserResponseDto>> {
    return this.adminService.listUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user with relation counts (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AdminUserResponseDto, { description: 'The user' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
    type: ApiErrorResponseDto,
  })
  getOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AdminUserResponseDto> {
    return this.adminService.getUser(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change a user role (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AdminUserResponseDto, { description: 'The updated user' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Changing own role, or demoting the last remaining admin',
    type: ApiErrorResponseDto,
  })
  changeRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() current: AuthUser,
  ): Promise<AdminUserResponseDto> {
    return this.adminService.changeRole(id, dto.role, current.id);
  }

  @Post(':id/verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a user's email as verified (admin)" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(AdminUserResponseDto, { description: 'The updated user' })
  verifyEmail(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AdminUserResponseDto> {
    return this.adminService.verifyUserEmail(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a user (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessPrimitiveResponse({
    description: 'User deleted',
    example: { message: 'User deleted' },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Deleting own account, or the last remaining admin',
    type: ApiErrorResponseDto,
  })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() current: AuthUser,
  ): Promise<{ message: string }> {
    return this.adminService.deleteUser(id, current.id);
  }
}
