import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiSuccessPrimitiveResponse,
  ApiSuccessResponse,
} from '../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../common/swagger/api-error-response.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiSuccessResponse(UserResponseDto, {
    description: 'Returns the authenticated user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  async me(@CurrentUser() current: { id: string }): Promise<UserResponseDto> {
    const user = await this.usersService.findByIdOrThrow(current.id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current authenticated user' })
  @ApiSuccessResponse(UserResponseDto, {
    description: 'Returns the updated user',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already in use',
    type: ApiErrorResponseDto,
  })
  async updateMe(
    @CurrentUser() current: { id: string },
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(current.id, dto);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Post('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password for the current authenticated user',
    description:
      'Requires the current password for verification. ' +
      'The current JWT remains valid after a password change.',
  })
  @ApiSuccessPrimitiveResponse({
    description: 'Password changed',
    example: { message: 'Password updated successfully' },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Current password is incorrect',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'New password is the same as current, or fails validation',
    type: ApiErrorResponseDto,
  })
  async changePassword(
    @CurrentUser() current: { id: string },
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(current.id, dto);
    return { message: 'Password updated successfully' };
  }
}
