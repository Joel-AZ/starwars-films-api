import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './common/configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Star Wars Films API')
    .setDescription(
      'Film management API built with NestJS. Includes JWT authentication, ' +
        'role-based access control and synchronization with the public Star Wars API.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .build();

  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
    {
      customSiteTitle: 'Star Wars Films API',
      swaggerOptions: { persistAuthorization: true },
    },
  );

  const port = app.get(ConfigService).get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
