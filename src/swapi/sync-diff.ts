import type { Film } from '../generated/prisma/client';
import type { SwapiFilm } from './swapi-payload';

// The columns the sync owns. Anything outside this list — id, source,
// timestamps — is never touched by an import.
export interface SyncableFilmFields {
  title: string;
  openingCrawl: string;
  director: string;
  producer: string;
  releaseDate: Date;
}

export function toSyncableFields(film: SwapiFilm): SyncableFilmFields {
  return {
    title: film.title,
    openingCrawl: film.opening_crawl,
    director: film.director,
    producer: film.producer,
    releaseDate: new Date(film.release_date),
  };
}

// Pure, so the "running it twice changes nothing" guarantee is testable
// without a database. Dates are compared by instant, not by identity.
export function hasChanges(
  stored: Pick<Film, keyof SyncableFilmFields>,
  incoming: SyncableFilmFields,
): boolean {
  return (
    stored.title !== incoming.title ||
    stored.openingCrawl !== incoming.openingCrawl ||
    stored.director !== incoming.director ||
    stored.producer !== incoming.producer ||
    stored.releaseDate.getTime() !== incoming.releaseDate.getTime()
  );
}
