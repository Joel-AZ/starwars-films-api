import { config } from 'dotenv';

config({ path: '.env.test', override: true });

const databaseUrl = process.env.DATABASE_URL ?? '';

if (!/_test(\?|$)/.test(databaseUrl)) {
  const masked = databaseUrl.replace(/:\/\/[^@/]*@/, '://***@');

  throw new Error(
    `Refusing to run e2e tests: DATABASE_URL does not point at a test database (${masked || 'empty'}).\n` +
      'These tests truncate tables. Point DATABASE_URL at a database whose name ends in "_test" ' +
      '(see .env.test) before running them.',
  );
}
