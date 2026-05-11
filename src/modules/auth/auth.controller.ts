import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';
import { AppConfig, JwtConfig } from '../../config/configuration';
import {
  ApiSuccessPrimitiveResponse,
  ApiSuccessResponse,
} from '../../common/swagger/api-response.decorator';
import { ApiErrorResponseDto } from '../../common/swagger/api-error-response.dto';

const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 10 } };

@ApiTags('Auth')
@Controller('auth')
@Throttle(AUTH_THROTTLE)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Create an account and obtain an access + refresh token pair',
    description:
      'On success, the refresh token is BOTH set as an `httpOnly` cookie ' +
      '(for web clients) AND returned in the JSON body (for mobile / non-cookie clients).',
  })
  @ApiSuccessResponse(AuthResponseDto, {
    status: HttpStatus.CREATED,
    description: 'User created and authenticated',
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponseDto })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, type: ApiErrorResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const response = await this.authService.register(dto);
    this.attachRefreshCookie(res, response.refreshToken);
    return response;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive an access + refresh token pair' })
  @ApiSuccessResponse(AuthResponseDto)
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: ApiErrorResponseDto })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, type: ApiErrorResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const response = await this.authService.login(dto);
    this.attachRefreshCookie(res, response.refreshToken);
    return response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate a refresh token into a new access + refresh pair',
    description:
      'The refresh token is read from the `refresh_token` httpOnly cookie ' +
      'if present, otherwise from the JSON body. The old token is invalidated; ' +
      'replaying a revoked token revokes the entire user refresh chain.',
  })
  @ApiSuccessResponse(AuthResponseDto)
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Refresh token is missing, invalid, expired, or reused',
    type: ApiErrorResponseDto,
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const token = this.extractRefreshToken(req, dto);
    const response = await this.authService.refresh(token);
    this.attachRefreshCookie(res, response.refreshToken);
    return response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke a single refresh token (sign-out for this device)',
    description:
      'Clears the `refresh_token` cookie and deletes the matching row. ' +
      'Idempotent — succeeds even if the token is already unknown.',
  })
  @ApiSuccessPrimitiveResponse({
    description: 'Refresh token revoked',
    example: { message: 'Logged out' },
  })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const token = this.tryExtractRefreshToken(req, dto);
    if (token) {
      await this.authService.logout(token);
    }
    clearRefreshCookie(res);
    return { message: 'Logged out' };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private attachRefreshCookie(res: Response, token: string): void {
    const appConfig = this.configService.getOrThrow<AppConfig>('app');
    const jwtConfig = this.configService.getOrThrow<JwtConfig>('jwt');
    setRefreshCookie(res, token, appConfig, jwtConfig);
  }

  /** Throws if no refresh token can be found in cookie or body. */
  private extractRefreshToken(req: Request, dto: RefreshTokenDto): string {
    const token = this.tryExtractRefreshToken(req, dto);
    if (!token) {
      throw new UnauthorizedException('Refresh token not provided');
    }
    return token;
  }

  private tryExtractRefreshToken(
    req: Request,
    dto: RefreshTokenDto,
  ): string | undefined {
    const fromCookie = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE_NAME
    ];
    return fromCookie ?? dto.refreshToken;
  }
}
