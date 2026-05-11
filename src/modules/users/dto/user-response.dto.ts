import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ example: '8c5f4e64-1c39-4a55-9c8e-1e1b9c41a0a2', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'student@example.com', format: 'email' })
  @Expose()
  email: string;

  @ApiProperty({ example: '2026-05-11T12:00:00.000Z', format: 'date-time' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-05-11T12:00:00.000Z', format: 'date-time' })
  @Expose()
  updatedAt: Date;
}
