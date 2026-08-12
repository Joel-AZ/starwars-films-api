import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUser } from './jwt-payload.interface';

// @GetUser() user: CurrentUser — reads what JwtStrategy attached to the request.
export const GetUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser => {
    const request = context.switchToHttp().getRequest<{ user: CurrentUser }>();

    return request.user;
  },
);
