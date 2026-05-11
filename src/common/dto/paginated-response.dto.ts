import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * Generic envelope for paginated list responses. The Transform/Class
 * serializer interceptors still wrap this object in `{ success, data, ... }`,
 * so the final body becomes:
 *
 *   { success: true, data: { items, total, page, limit, hasMore }, timestamp }
 *
 * `items` is the page slice; `total` is the unfiltered row count for the
 * query (needed by clients to render pagination controls).
 */
export class PaginatedResponseDto<T> {
  @Expose()
  items: T[];

  @ApiProperty({ example: 137 })
  @Expose()
  total: number;

  @ApiProperty({ example: 1 })
  @Expose()
  page: number;

  @ApiProperty({ example: 20 })
  @Expose()
  limit: number;

  @ApiProperty({ example: true })
  @Expose()
  hasMore: boolean;
}
