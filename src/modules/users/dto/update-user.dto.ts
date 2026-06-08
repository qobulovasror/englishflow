import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'new-email@example.com',
    description: 'New email address. Must be unique.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'CurrentPass123!',
    description:
      'The current password — required when changing email to prevent account ' +
      'takeover via stolen access tokens. Ignored when no email change is requested.',
  })
  @IsString()
  currentPassword: string;
}
