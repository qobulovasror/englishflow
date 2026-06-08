import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import {
  Prisma,
} from '@prisma/client';
import { AppConfig } from '../../config/configuration';

export interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  errors?: unknown;
  path: string;
  timestamp: string;
  requestId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly configService: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const path = httpAdapter.getRequestUrl(request) ?? '';

    const { statusCode, message, error, errors } = this.normalize(exception);

    const isProduction =
      this.configService.get<AppConfig>('app')?.nodeEnv === 'production';

    const requestId =
      typeof request.id === 'string' && request.id.length > 0
        ? request.id
        : undefined;

    if (statusCode >= 500) {
      this.logger.error(
        `[${requestId ?? '-'}] ${request.method} ${path} -> ${statusCode} ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${requestId ?? '-'}] ${request.method} ${path} -> ${statusCode} ${message}`,
      );
    }

    const body: ErrorResponseBody = {
      success: false,
      statusCode,
      message: isProduction && statusCode >= 500 ? 'Internal server error' : message,
      error,
      ...(errors ? { errors } : {}),
      path,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    };

    httpAdapter.reply(response, body, statusCode);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
    errors?: unknown;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return {
          statusCode,
          message: res,
          error: HttpStatus[statusCode] ?? 'Error',
        };
      }

      const body = res as Record<string, unknown>;
      const rawMessage = body.message;
      const isValidationError = Array.isArray(rawMessage);

      return {
        statusCode,
        message: isValidationError
          ? 'Validation failed'
          : (rawMessage as string) ?? exception.message,
        error: (body.error as string) ?? HttpStatus[statusCode] ?? 'Error',
        ...(isValidationError ? { errors: rawMessage } : {}),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaKnownError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid database query',
        error: 'Bad Request',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        exception instanceof Error ? exception.message : 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  private handlePrismaKnownError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    error: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        return {
          statusCode: HttpStatus.CONFLICT,
          message: target
            ? `A record with this ${target} already exists`
            : 'Unique constraint violation',
          error: 'Conflict',
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Related record does not exist',
          error: 'Bad Request',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
          error: 'Internal Server Error',
        };
    }
  }
}
