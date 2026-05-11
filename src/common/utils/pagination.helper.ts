import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';

/**
 * Wraps a page slice and total count into a `PaginatedResponseDto<T>`.
 *
 *   const [items, total] = await prisma.$transaction([
 *     prisma.word.findMany({ skip, take, where }),
 *     prisma.word.count({ where }),
 *   ]);
 *   return paginate(items, total, query);
 */
export function paginate<T>(
  items: T[],
  total: number,
  query: PaginationQueryDto,
): PaginatedResponseDto<T> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  return {
    items,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}
