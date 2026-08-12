import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestContext {
  app: INestApplication<App>;
  prisma: PrismaService;
}

// `customize` is where providers get replaced — the Star Wars client, for
// instance, so no test ever reaches out to the real API.
export async function createTestApp(
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<TestContext> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleFixture = await (
    customize ? customize(builder) : builder
  ).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return { app, prisma: app.get(PrismaService) };
}
