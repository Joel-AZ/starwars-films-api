import { hash } from 'bcryptjs';
import request from 'supertest';
import { AUTH_CONFIG } from '../src/config/auth.config';
import { Role } from '../src/generated/prisma/enums';
import { TestContext } from './create-app';

const PASSWORD = 'the-force-is-strong';

interface AuthBody {
  accessToken: string;
}

// A regular user comes from the public endpoint, exactly like a real client.
export async function registerUser(
  ctx: TestContext,
  email = 'user@e2e.test',
): Promise<string> {
  const response = await request(ctx.app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, name: 'Wedge Antilles', password: PASSWORD })
    .expect(201);

  return (response.body as AuthBody).accessToken;
}

// An administrator cannot: registration hardcodes the USER role, so the row is
// inserted directly and then authenticated through the real login endpoint.
export async function loginAsAdmin(
  ctx: TestContext,
  email = 'admin@e2e.test',
): Promise<string> {
  await ctx.prisma.user.create({
    data: {
      email,
      name: 'Mon Mothma',
      role: Role.ADMIN,
      password: await hash(PASSWORD, AUTH_CONFIG.bcryptRounds),
    },
  });

  const response = await request(ctx.app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);

  return (response.body as AuthBody).accessToken;
}
