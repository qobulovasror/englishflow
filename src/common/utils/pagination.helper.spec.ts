import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { paginate } from './pagination.helper';

function query(page?: number, limit?: number): PaginationQueryDto {
  return plainToInstance(PaginationQueryDto, { page, limit });
}

describe('paginate', () => {
  it('wraps items with metadata using query values', () => {
    const result = paginate(['a', 'b', 'c'], 137, query(2, 20));

    expect(result).toEqual({
      items: ['a', 'b', 'c'],
      total: 137,
      page: 2,
      limit: 20,
      hasMore: true,
    });
  });

  it('flags hasMore=false on the last page', () => {
    expect(paginate(['x'], 21, query(2, 20)).hasMore).toBe(false);
  });

  it('uses defaults when page/limit are omitted', () => {
    const result = paginate([], 0, query());
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.hasMore).toBe(false);
  });

  it('hasMore is false when total fits in one page', () => {
    expect(paginate(['a', 'b'], 2, query(1, 20)).hasMore).toBe(false);
  });

  it('hasMore is true exactly when (page * limit) < total', () => {
    expect(paginate([], 41, query(2, 20)).hasMore).toBe(true);
    expect(paginate([], 40, query(2, 20)).hasMore).toBe(false);
  });
});

describe('PaginationQueryDto skip/take', () => {
  it('computes skip as (page - 1) * limit', () => {
    expect(query(1, 20).skip).toBe(0);
    expect(query(2, 20).skip).toBe(20);
    expect(query(3, 50).skip).toBe(100);
  });

  it('take equals limit', () => {
    expect(query(1, 25).take).toBe(25);
  });

  it('falls back to defaults when fields missing', () => {
    const q = query();
    expect(q.skip).toBe(0);
    expect(q.take).toBe(20);
  });
});
