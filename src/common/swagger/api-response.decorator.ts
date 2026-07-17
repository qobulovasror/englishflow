import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';

interface ApiSuccessOptions {
  description?: string;
  isArray?: boolean;
  status?: HttpStatus;
}

/**
 * Documents an endpoint response wrapped in the standard success envelope
 * `{ success: true, data: <T>, timestamp: string }` produced by
 * `TransformInterceptor`.
 */
export function ApiSuccessResponse<T extends Type<unknown>>(
  dataType: T,
  options: ApiSuccessOptions = {},
) {
  const { description, isArray = false, status = HttpStatus.OK } = options;

  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(dataType) } }
    : { $ref: getSchemaPath(dataType) };

  return applyDecorators(
    ApiExtraModels(dataType),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['success', 'data', 'timestamp'],
        properties: {
          success: { type: 'boolean', example: true },
          data: dataSchema,
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    } as ApiResponseOptions),
  );
}

interface ApiPrimitiveOptions {
  description?: string;
  status?: HttpStatus;
  example?: unknown;
}

/**
 * Documents an endpoint that returns a paginated list. Produces a schema
 * matching `PaginatedResponseDto<T>` wrapped in the success envelope.
 */
export function ApiPaginatedResponse<T extends Type<unknown>>(
  itemType: T,
  options: { description?: string; status?: HttpStatus } = {},
) {
  const { description, status = HttpStatus.OK } = options;

  return applyDecorators(
    ApiExtraModels(itemType),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['success', 'data', 'timestamp'],
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            required: ['items', 'total', 'page', 'limit', 'hasMore'],
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(itemType) },
              },
              total: { type: 'integer', example: 137 },
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              hasMore: { type: 'boolean', example: true },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    } as ApiResponseOptions),
  );
}

/**
 * For endpoints that return a primitive or untyped object (e.g. {message: string}).
 */
export function ApiSuccessPrimitiveResponse(options: ApiPrimitiveOptions = {}) {
  const { description, status = HttpStatus.OK, example } = options;
  return ApiResponse({
    status,
    description,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: example !== undefined ? { example } : { type: 'object' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  });
}
