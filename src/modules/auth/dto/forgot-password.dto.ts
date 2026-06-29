import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'student@example.com', format: 'email' })
  @IsEmail()
  email: string;
}
