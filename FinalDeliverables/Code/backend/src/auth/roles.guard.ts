import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required for an endpoint, allow access.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    interface RequestUser {
      userId: number;
      email: string;
      role: 'TRADER' | 'ADMIN';
    }

    const { user }: { user: RequestUser } = context.switchToHttp().getRequest();

    // Check if the user object and role exist, and if the user's role is included in the required roles.
    return Boolean(
      user && user.role && requiredRoles.some((role) => user.role === role),
    );
  }
}
