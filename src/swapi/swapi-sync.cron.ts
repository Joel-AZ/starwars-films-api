import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { SwapiSyncService } from './swapi-sync.service';

export const SWAPI_SYNC_JOB = 'swapi-sync';

@Injectable()
export class SwapiSyncCron implements OnModuleInit {
  private readonly logger = new Logger(SwapiSyncCron.name);

  constructor(
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerRegistry,
    private readonly sync: SwapiSyncService,
  ) {}

  // Registered by hand rather than with @Cron so the schedule can come from the
  // environment, and so it can be switched off entirely: nobody wants a job
  // hitting a third-party API from a laptop or from a test run.
  onModuleInit(): void {
    if (!this.config.get<boolean>('SWAPI_SYNC_ENABLED')) {
      this.logger.log('Scheduled synchronization is off (SWAPI_SYNC_ENABLED).');
      return;
    }

    const schedule = this.config.getOrThrow<string>('SWAPI_SYNC_CRON');

    this.scheduler.addCronJob(
      SWAPI_SYNC_JOB,
      new CronJob(schedule, () => {
        void this.run();
      }),
    );
    this.scheduler.getCronJob(SWAPI_SYNC_JOB).start();

    this.logger.log(`Scheduled synchronization registered with "${schedule}".`);
  }

  // A failure here must not take the process down: the job runs again on the
  // next tick, and the endpoint is always available to force one.
  private async run(): Promise<void> {
    try {
      await this.sync.sync();
    } catch (error) {
      this.logger.error('Scheduled synchronization failed', error);
    }
  }
}
