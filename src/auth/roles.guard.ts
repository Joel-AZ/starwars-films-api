import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/enums';
import { ROLES_KEY } from './auth.decorator';
import type { CurrentUser } from './jwt-payload.interface';

// Runs after JwtAuthGuard, so request.user is already resolved. Declaring no
// roles means "any authenticated user".
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: CurrentUser }>();

    if (!user) {
      throw new UnauthorizedException();
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `This endpoint requires one of the following roles: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}
