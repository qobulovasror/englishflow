import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from './register.dto';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'The opaque password-reset token delivered by email.',
    example: 'h6XdR3pK8c-NlYvQ3jKz2hYW9bP5MZeT7vL_8nXrSc',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewStrongerPass456!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    description:
      'The new password. Must contain at least one letter and one digit.',
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, {
    message: 'newPassword must contain at least one letter and one digit',
  })
  newPassword: string;
}
