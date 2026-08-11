import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hashSync } from 'bcryptjs';
import type { User } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const PASSWORD = 'the-force-is-strong';

const userFixture = (over: Partial<User> = {}): User => ({
  id: '11111111-1111-1111-1111-111111111111',
  email: 'luke@rebellion.org',
  name: 'Luke Skywalker',
  password: hashSync(PASSWORD, 10),
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('AuthService', () => {
  let users: jest.Mocked<
    Pick<UsersService, 'findByEmail' | 'findById' | 'create'>
  >;
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

    service = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('stores a hashed password, never the plaintext', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockImplementation((data) =>
        Promise.resolve(userFixture({ ...data, password: data.password })),
      );

      await service.register({
        email: 'luke@rebellion.org',
        name: 'Luke Skywalker',
        password: PASSWORD,
      });

      const stored = users.create.mock.calls[0][0];

      expect(stored.password).not.toBe(PASSWORD);
      await expect(compare(PASSWORD, stored.password)).resolves.toBe(true);
    });

    it('always assigns the USER role', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockImplementation((data) =>
        Promise.resolve(userFixture(data)),
      );

      await service.register({
        email: 'luke@rebellion.org',
        name: 'Luke Skywalker',
        password: PASSWORD,
      });

      expect(users.create.mock.calls[0][0].role).toBe(Role.USER);
    });

    it('returns a token and a profile without the password', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(userFixture());

      const result = await service.register({
        email: 'luke@rebellion.org',
        name: 'Luke Skywalker',
        password: PASSWORD,
      });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.user).toEqual({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'luke@rebellion.org',
        name: 'Luke Skywalker',
        role: Role.USER,
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('rejects an email that is already registered', async () => {
      users.findByEmail.mockResolvedValue(userFixture());

      await expect(
        service.register({
          email: 'luke@rebellion.org',
          name: 'Luke Skywalker',
          password: PASSWORD,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('signs a token carrying the user id, email and role', async () => {
      users.findByEmail.mockResolvedValue(userFixture({ role: Role.ADMIN }));

      await service.login({ email: 'luke@rebellion.org', password: PASSWORD });

      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: '11111111-1111-1111-1111-111111111111',
        email: 'luke@rebellion.org',
        role: Role.ADMIN,
      });
    });

    it('rejects a wrong password', async () => {
      users.findByEmail.mockResolvedValue(userFixture());

      await expect(
        service.login({
          email: 'luke@rebellion.org',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown email without revealing that it does not exist', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@rebellion.org', password: PASSWORD }),
      ).rejects.toThrow('Invalid email or password.');
    });
  });

  describe('profile', () => {
    it('returns the profile of an existing user', async () => {
      users.findById.mockResolvedValue(userFixture());

      await expect(
        service.profile('11111111-1111-1111-1111-111111111111'),
      ).resolves.toEqual({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'luke@rebellion.org',
        name: 'Luke Skywalker',
        role: Role.USER,
      });
    });

    it('rejects when the user behind a valid token no longer exists', async () => {
      users.findById.mockResolvedValue(null);

      await expect(service.profile('gone')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
