import { NodeEnv, validate } from './env.validation';

const baseEnv = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/starwars',
  JWT_SECRET: 'a-secret-long-enough-to-pass',
};

describe('validate (environment)', () => {
  it('applies defaults for every optional variable', () => {
    const env = validate(baseEnv);

    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(3000);
    expect(env.JWT_EXPIRES_IN).toBe('1h');
    expect(env.SWAPI_BASE_URL).toBe('https://www.swapi.tech/api');
    expect(env.SWAPI_SYNC_ENABLED).toBe(false);
    expect(env.SWAPI_SYNC_CRON).toBe('0 3 * * *');
  });

  it('coerces PORT from string to number', () => {
    expect(validate({ ...baseEnv, PORT: '8080' }).PORT).toBe(8080);
  });

  it('coerces SWAPI_SYNC_ENABLED from string to boolean', () => {
    expect(
      validate({ ...baseEnv, SWAPI_SYNC_ENABLED: 'true' }).SWAPI_SYNC_ENABLED,
    ).toBe(true);
    expect(
      validate({ ...baseEnv, SWAPI_SYNC_ENABLED: 'false' }).SWAPI_SYNC_ENABLED,
    ).toBe(false);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validate({ JWT_SECRET: baseEnv.JWT_SECRET })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects a JWT_SECRET shorter than 16 characters', () => {
    expect(() => validate({ ...baseEnv, JWT_SECRET: 'too-short' })).toThrow(
      /at least 16 characters/,
    );
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validate({ ...baseEnv, NODE_ENV: 'staging' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects a PORT outside the valid range', () => {
    expect(() => validate({ ...baseEnv, PORT: '99999' })).toThrow(
      /Invalid environment configuration/,
    );
  });
});
