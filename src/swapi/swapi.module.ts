import { Module } from '@nestjs/common';
import { SwapiSyncCron } from './swapi-sync.cron';
import { SwapiSyncService } from './swapi-sync.service';
import { SwapiClient } from './swapi.client';

@Module({
  providers: [SwapiClient, SwapiSyncService, SwapiSyncCron],
  exports: [SwapiSyncService],
})
export class SwapiModule {}
