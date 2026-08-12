import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail } from '../../common/transforms';
import { AUTH_CONFIG } from '../../config/auth.config';

export class LoginDto {
  @ApiProperty({ example: 'user@starwars.test' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(AUTH_CONFIG.minPasswordLength)
  @MaxLength(AUTH_CONFIG.maxPasswordBytes)
  password!: string;
}
