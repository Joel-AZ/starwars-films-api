import { Injectable, Logger } from '@nestjs/common';
import { FilmSource } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SyncReportDto } from './dto/sync-report.dto';
import { hasChanges, toSyncableFields } from './sync-diff';
import { SwapiClient } from './swapi.client';

@Injectable()
export class SwapiSyncService {
  private readonly logger = new Logger(SwapiSyncService.name);

  constructor(
    private readonly client: SwapiClient,
    private readonly prisma: PrismaService,
  ) {}

  // Idempotent: films are matched by their episode number, so running this
  // twice creates nothing the second time. Reports what it did instead of
  // answering with silence, which is what makes it debuggable in production.
  async sync(): Promise<SyncReportDto> {
    const startedAt = Date.now();
    const films = await this.client.fetchFilms();

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const film of films) {
      const incoming = toSyncableFields(film);
      const stored = await this.prisma.film.findUnique({
        where: { episodeId: film.episode_id },
      });

      if (!stored) {
        await this.prisma.film.create({
          data: {
            ...incoming,
            episodeId: film.episode_id,
            source: FilmSource.SWAPI,
          },
        });
        created += 1;
        continue;
      }

      if (!hasChanges(stored, incoming)) {
        unchanged += 1;
        continue;
      }

      await this.prisma.film.update({
        where: { id: stored.id },
        data: incoming,
      });
      updated += 1;
    }

    const report: SyncReportDto = {
      created,
      updated,
      unchanged,
      received: films.length,
      durationMs: Date.now() - startedAt,
    };

    this.logger.log(
      `Synchronized ${report.received} films: ${created} created, ${updated} updated, ${unchanged} unchanged (${report.durationMs}ms)`,
    );

    return report;
  }
}
