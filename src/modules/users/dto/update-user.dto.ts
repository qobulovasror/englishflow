import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'new-email@example.com',
    description: 'New email address. Must be unique.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
