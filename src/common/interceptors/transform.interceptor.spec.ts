import { ExecutionContext, StreamableFile } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

const noopContext = {} as ExecutionContext;

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('wraps a value in the success envelope', async () => {
    const handler = { handle: () => of({ id: 'abc', name: 'word' }) };

    const result = (await lastValueFrom(
      interceptor.intercept(noopContext, handler),
    )) as { success: true; data: unknown; timestamp: string };

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'abc', name: 'word' });
    expect(typeof result.timestamp).toBe('string');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('wraps primitives and null too', async () => {
    const handler = { handle: () => of(null) };
    const result = (await lastValueFrom(
      interceptor.intercept(noopContext, handler),
    )) as { success: true; data: unknown };

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it('passes StreamableFile through untouched', async () => {
    const stream = new StreamableFile(Buffer.from('hello'));
    const handler = { handle: () => of(stream) };

    const result = await lastValueFrom(
      interceptor.intercept(noopContext, handler),
    );

    expect(result).toBe(stream);
  });

  it('preserves arrays as the data payload', async () => {
    const handler = { handle: () => of([1, 2, 3]) };
    const result = (await lastValueFrom(
      interceptor.intercept(noopContext, handler),
    )) as { data: number[] };

    expect(result.data).toEqual([1, 2, 3]);
  });
});
