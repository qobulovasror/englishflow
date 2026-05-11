import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'student@example.com', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    minLength: 6,
    description: 'Plain text password, hashed server-side with bcrypt',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
