import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/enums';
import type { CurrentUser } from './jwt-payload.interface';
import { RolesGuard } from './roles.guard';

const contextFor = (user?: Partial<CurrentUser>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => jest.fn(),
    getClass: () => class {},
  }) as unknown as ExecutionContext;

const guardRequiring = (requiredRoles?: Role[]): RolesGuard => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;

  return new RolesGuard(reflector);
};

describe('RolesGuard', () => {
  it('allows the request when the handler declares no roles', () => {
    expect(guardRequiring(undefined).canActivate(contextFor())).toBe(true);
  });

  it('allows the request when the role list is empty', () => {
    expect(guardRequiring([]).canActivate(contextFor())).toBe(true);
  });

  it('allows an ADMIN through an ADMIN-only endpoint', () => {
    const guard = guardRequiring([Role.ADMIN]);

    expect(guard.canActivate(contextFor({ role: Role.ADMIN }))).toBe(true);
  });

  it('rejects a USER on an ADMIN-only endpoint with 403', () => {
    const guard = guardRequiring([Role.ADMIN]);

    expect(() => guard.canActivate(contextFor({ role: Role.USER }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects an ADMIN on a USER-only endpoint with 403', () => {
    const guard = guardRequiring([Role.USER]);

    expect(() => guard.canActivate(contextFor({ role: Role.ADMIN }))).toThrow(
      ForbiddenException,
    );
  });

  it('accepts any listed role when several are allowed', () => {
    const guard = guardRequiring([Role.ADMIN, Role.USER]);

    expect(guard.canActivate(contextFor({ role: Role.USER }))).toBe(true);
  });

  it('rejects with 401 when a role is required but no user is attached', () => {
    const guard = guardRequiring([Role.ADMIN]);

    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
