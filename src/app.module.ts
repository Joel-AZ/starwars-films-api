import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { NodeEnv, validate } from './config/env.validation';
import { THROTTLE_CONFIG } from './config/throttle.config';
import { FilmsModule } from './films/films.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          { ttl: THROTTLE_CONFIG.ttlMs, limit: THROTTLE_CONFIG.limit },
        ],
        // Off under test: the e2e suite fires dozens of logins in seconds and
        // would throttle itself rather than the behaviour it is checking.
        skipIf: () => config.get<NodeEnv>('NODE_ENV') === NodeEnv.Test,
      }),
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    FilmsModule,
  ],
})
export class AppModule {}
