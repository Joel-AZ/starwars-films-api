import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SwapiModule } from '../swapi/swapi.module';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';

@Module({
  imports: [AuthModule, SwapiModule],
  controllers: [FilmsController],
  providers: [FilmsService],
  exports: [FilmsService],
})
export class FilmsModule {}
