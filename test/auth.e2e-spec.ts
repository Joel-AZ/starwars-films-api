import request from 'supertest';
import { Role } from '../src/generated/prisma/enums';
import { createTestApp, TestContext } from './create-app';

interface AuthResponseBody {
  accessToken: string;
  tokenType: string;
  user: { id: string; email: string; name: string; role: string };
}

const CREDENTIALS = {
  email: 'luke@rebellion.org',
  name: 'Luke Skywalker',
  password: 'the-force-is-strong',
};

describe('Auth (e2e)', () => {
  let ctx: TestContext;

  const server = () => ctx.app.getHttpServer();

  const register = (body: Record<string, unknown> = CREDENTIALS) =>
    request(server()).post('/api/auth/register').send(body);

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await ctx.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await ctx.prisma.user.deleteMany();
    await ctx.app.close();
  });

  describe('POST /api/auth/register', () => {
    it('creates the account and returns a token with a USER profile', async () => {
      const response = await register().expect(201);
      const body = response.body as AuthResponseBody;

      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.tokenType).toBe('Bearer');
      expect(body.user).toMatchObject({
        email: CREDENTIALS.email,
        name: CREDENTIALS.name,
        role: Role.USER,
      });
    });

    it('never returns the password hash', async () => {
      const response = await register().expect(201);

      expect(JSON.stringify(response.body)).not.toContain('password');
    });

    it('persists the password hashed, not in plain text', async () => {
      await register().expect(201);

      const stored = await ctx.prisma.user.findUnique({
        where: { email: CREDENTIALS.email },
      });

      expect(stored?.password).toBeDefined();
      expect(stored?.password).not.toBe(CREDENTIALS.password);
      expect(stored?.password.startsWith('$2')).toBe(true);
    });

    it('rejects a duplicate email with 409', async () => {
      await register().expect(201);
      await register().expect(409);
    });

    it('treats emails case-insensitively when detecting duplicates', async () => {
      await register().expect(201);
      await register({
        ...CREDENTIALS,
        email: '  LUKE@Rebellion.ORG  ',
      }).expect(409);
    });

    it('rejects a malformed email with 400', async () => {
      await register({ ...CREDENTIALS, email: 'not-an-email' }).expect(400);
    });

    it('rejects a password shorter than 8 characters with 400', async () => {
      await register({ ...CREDENTIALS, password: 'short' }).expect(400);
    });

    it('rejects unknown properties with 400', async () => {
      await register({ ...CREDENTIALS, role: Role.ADMIN }).expect(400);
    });

    it('cannot be used to create an administrator', async () => {
      await register({ ...CREDENTIALS, role: Role.ADMIN }).expect(400);

      const admins = await ctx.prisma.user.count({
        where: { role: Role.ADMIN },
      });

      expect(admins).toBe(0);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await register().expect(201);
    });

    it('returns a token for valid credentials', async () => {
      const response = await request(server())
        .post('/api/auth/login')
        .send({ email: CREDENTIALS.email, password: CREDENTIALS.password })
        .expect(200);

      expect((response.body as AuthResponseBody).accessToken).toEqual(
        expect.any(String),
      );
    });

    it('ignores surrounding spaces and casing in the email', async () => {
      await request(server())
        .post('/api/auth/login')
        .send({
          email: '  LUKE@Rebellion.ORG ',
          password: CREDENTIALS.password,
        })
        .expect(200);
    });

    it('rejects a wrong password with 401', async () => {
      await request(server())
        .post('/api/auth/login')
        .send({ email: CREDENTIALS.email, password: 'wrong-password' })
        .expect(401);
    });

    it('rejects an unknown email with 401', async () => {
      await request(server())
        .post('/api/auth/login')
        .send({ email: 'vader@empire.gov', password: CREDENTIALS.password })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const response = await register().expect(201);
      token = (response.body as AuthResponseBody).accessToken;
    });

    it('returns the profile behind the token', async () => {
      const response = await request(server())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: CREDENTIALS.email,
        name: CREDENTIALS.name,
        role: Role.USER,
      });
    });

    it('rejects a request without a token with 401', async () => {
      await request(server()).get('/api/auth/me').expect(401);
    });

    it('rejects a malformed token with 401', async () => {
      await request(server())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });

    it('rejects a token whose user was deleted with 401', async () => {
      await ctx.prisma.user.deleteMany();

      await request(server())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });
});
