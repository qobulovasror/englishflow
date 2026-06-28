import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route (or whole controller) to the listed roles. Pair with
 * `RolesGuard`, which reads the `ROLES_KEY` metadata — mirrors the
 * `@Public()` / `IS_PUBLIC_KEY` pattern. A route with no `@Roles()` is open to
 * any authenticated user.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
