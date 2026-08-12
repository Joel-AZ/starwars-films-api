import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';
import { AUTH_CONFIG } from '../src/config/auth.config';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role } from '../src/generated/prisma/enums';

config();

// Only the administrator. Regular users are created the way the API intends —
// through POST /auth/register — but an administrator cannot be: registration
// hardcodes the USER role precisely so nobody can grant themselves access by
// adding a field to the payload. That leaves the seed as the one place the
// first administrator can come from.
const SEED_ADMIN = {
  email: 'admin@starwars.test',
  name: 'Mon Mothma',
  password: 'Password123!',
};

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    }),
  });

  try {
    const password = await hash(SEED_ADMIN.password, AUTH_CONFIG.bcryptRounds);

    await prisma.user.upsert({
      where: { email: SEED_ADMIN.email },
      update: { name: SEED_ADMIN.name, role: Role.ADMIN, password },
      create: {
        email: SEED_ADMIN.email,
        name: SEED_ADMIN.name,
        role: Role.ADMIN,
        password,
      },
    });

    console.log(`seeded ADMIN ${SEED_ADMIN.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
