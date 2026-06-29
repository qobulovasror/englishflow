import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    example: 'CurrentPass123!',
    description:
      'The current password — required to confirm account deletion and ' +
      'prevent takeover-then-delete via a stolen access token.',
  })
  @IsString()
  currentPassword: string;
}
