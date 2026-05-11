import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Web clients omit this field — the token is read from the `httpOnly`
 * `refresh_token` cookie instead. Mobile clients (and any non-cookie
 * transport) send it in the body.
 */
export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Opaque refresh token. Optional when the request carries the ' +
      '`refresh_token` httpOnly cookie (web clients).',
    example: 'h6XdR3pK8c-NlYvQ3jKz2hYW9bP5MZeT7vL_8nXrSc',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  refreshToken?: string;
}
