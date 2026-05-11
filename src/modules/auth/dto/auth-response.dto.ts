import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ type: () => UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Short-lived JWT (default 15 min). Send as `Authorization: Bearer <token>` on authenticated requests.',
  })
  @Expose()
  accessToken: string;

  @ApiProperty({
    example: 'h6XdR3pK8c-NlYvQ3jKz2hYW9bP5MZeT7vL_8nXrSc',
    description:
      'Opaque long-lived refresh token (default 30 days). POST to /auth/refresh to rotate this into a new access + refresh pair when the access token expires.',
  })
  @Expose()
  refreshToken: string;
}
