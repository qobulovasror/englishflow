import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'The opaque email-verification token delivered by email.',
    example: 'h6XdR3pK8c-NlYvQ3jKz2hYW9bP5MZeT7vL_8nXrSc',
  })
  @IsString()
  token: string;
}
