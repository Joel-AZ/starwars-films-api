import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

export const ROLES_KEY = 'roles';

export function Auth(...roles: Role[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth('JWT'),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ...(roles.length > 0
      ? [
          ApiForbiddenResponse({
            description: `Requires one of the following roles: ${roles.join(', ')}`,
          }),
        ]
      : []),
  );
}
