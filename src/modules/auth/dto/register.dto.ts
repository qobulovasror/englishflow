import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// 8 is the modern minimum (NIST SP 800-63B). The complexity rule below
// requires letters + digits — not perfect, but cheap and noticeably better
// than no policy. Bcrypt truncates at 72 bytes, so we cap the max too.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class RegisterDto {
  @ApiProperty({ example: 'student@example.com', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    description:
      'Plain text password, hashed server-side with bcrypt. Must contain ' +
      'at least one letter and one digit.',
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, {
    message: 'password must contain at least one letter and one digit',
  })
  password: string;
}
