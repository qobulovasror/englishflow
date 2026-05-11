import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'CurrentPass123!',
    description: 'The user\'s current password',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewStrongerPass456!',
    minLength: 6,
    description: 'The new password to set',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
