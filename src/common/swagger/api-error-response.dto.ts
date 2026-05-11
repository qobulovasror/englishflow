import { ApiProperty } from '@nestjs/swagger';

/**
 * Documentation-only DTO that mirrors the shape produced by
 * `AllExceptionsFilter`.
 */
export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({
    example: ['email must be an email'],
    required: false,
    description: 'Present for validation errors',
    type: [String],
  })
  errors?: string[];

  @ApiProperty({ example: '/auth/register' })
  path: string;

  @ApiProperty({ example: '2026-05-11T12:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
