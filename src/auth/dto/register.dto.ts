import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail, trimmed } from '../../common/transforms';
import { AUTH_CONFIG } from '../../config/auth.config';

export class RegisterDto {
  @ApiProperty({ example: 'luke@rebellion.org', maxLength: 255 })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Luke Skywalker', minLength: 2, maxLength: 120 })
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'the-force-is-strong',
    minLength: AUTH_CONFIG.minPasswordLength,
    maxLength: AUTH_CONFIG.maxPasswordBytes,
    description:
      'Capped at 72 bytes because bcrypt silently truncates anything longer.',
  })
  @IsString()
  @MinLength(AUTH_CONFIG.minPasswordLength)
  @MaxLength(AUTH_CONFIG.maxPasswordBytes)
  password!: string;
}
