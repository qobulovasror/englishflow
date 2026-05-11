import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible, bypassing any globally-applied
 * authentication guard. Pair with a guard implementation that reads the
 * `IS_PUBLIC_KEY` metadata (see `JwtAuthGuard.canActivate` for the pattern).
 *
 * Today the project applies `JwtAuthGuard` per-controller via `@UseGuards`,
 * so this decorator is currently a no-op. It is here for the migration path
 * to a global guard: register `JwtAuthGuard` as a global `APP_GUARD`, then
 * use `@Public()` to opt out on `/auth/*`.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
