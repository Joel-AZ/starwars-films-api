import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail } from '../../common/transforms';

export class LoginDto {
  @ApiProperty({ example: 'luke@rebellion.org' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'the-force-is-strong' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
