import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to users that have at least one of the given roles.
 * Use together with `RolesGuard`:
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin')
 *   @Get('/admin/stats')
 *   ...
 *
 * Note: the `User` model does not yet have a `roles` field. Adding role-based
 * access requires a schema migration first.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
