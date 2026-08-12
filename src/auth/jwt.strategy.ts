import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import type { CurrentUser, JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Deliberately re-reads the user instead of trusting the payload: it costs a
  // query per request and in exchange a token stops working the moment its
  // account is deleted or its role changes, rather than when it expires.
  async validate(payload: JwtPayload): Promise<CurrentUser> {
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
