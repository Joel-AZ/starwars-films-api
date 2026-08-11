import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';

export class UserProfileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'luke@rebellion.org' })
  email!: string;

  @ApiProperty({ example: 'Luke Skywalker' })
  name!: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.USER })
  role!: Role;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT to send as `Authorization: Bearer <token>`.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;
}
