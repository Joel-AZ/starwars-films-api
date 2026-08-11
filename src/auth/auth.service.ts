import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import type { User } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './auth.types';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

// Compared against when the email does not exist, so a failed login costs the
// same time whether or not the account is real.
const DUMMY_PASSWORD_HASH = hashSync('no-such-account', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.users.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('That email is already registered.');
    }

    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      password: await hash(dto.password, BCRYPT_ROUNDS),
      role: Role.USER,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(dto.email);
    const passwordMatches = await compare(
      dto.password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user);
  }

  async profile(userId: string): Promise<UserProfileDto> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.toProfile(user);
  }

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      user: this.toProfile(user),
    };
  }

  private toProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
