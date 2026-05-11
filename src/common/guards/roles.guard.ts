import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface AuthenticatedRequest {
  user?: { id: string; email: string; roles?: string[] };
}

/**
 * Authorizes a request when the authenticated user has at least one of the
 * roles listed by `@Roles(...)`. If no `@Roles` decorator is present on the
 * route, the guard is a no-op.
 *
 * Expects `request.user` to be populated by an upstream auth guard
 * (`JwtAuthGuard`). Once the `User` model gains a `roles: string[]` column,
 * `JwtStrategy.validate` should include it on the returned payload.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRoles = request.user?.roles ?? [];

    const hasAny = required.some((role) => userRoles.includes(role));
    if (!hasAny) {
      throw new ForbiddenException(
        `This action requires one of: ${required.join(', ')}`,
      );
    }
    return true;
  }
}
