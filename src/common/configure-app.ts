import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from '../filters/prisma-exception.filter';

// Shared by main.ts and the e2e harness, so the tests exercise the same
// prefix, validation rules and error handling as production.
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
}
