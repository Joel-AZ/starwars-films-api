import { Role } from '../generated/prisma/enums';

// What travels inside the token. `sub` is the user id.
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

// What JwtStrategy attaches to request.user after re-validating against the DB.
export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
}
