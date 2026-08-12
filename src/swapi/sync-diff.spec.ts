import {
  hasChanges,
  toSyncableFields,
  type SyncableFilmFields,
} from './sync-diff';
import type { SwapiFilm } from './swapi-payload';

const swapiFilm: SwapiFilm = {
  title: 'A New Hope',
  episode_id: 4,
  opening_crawl: 'It is a period of civil war...',
  director: 'George Lucas',
  producer: 'Gary Kurtz, Rick McCallum',
  release_date: '1977-05-25',
};

const stored = (
  over: Partial<SyncableFilmFields> = {},
): SyncableFilmFields => ({
  ...toSyncableFields(swapiFilm),
  ...over,
});

describe('toSyncableFields', () => {
  it('maps the snake_case payload onto the local model', () => {
    expect(toSyncableFields(swapiFilm)).toEqual({
      title: 'A New Hope',
      openingCrawl: 'It is a period of civil war...',
      director: 'George Lucas',
      producer: 'Gary Kurtz, Rick McCallum',
      releaseDate: new Date('1977-05-25'),
    });
  });

  it('does not carry the episode number, which identifies rather than describes', () => {
    expect(toSyncableFields(swapiFilm)).not.toHaveProperty('episodeId');
  });
});

describe('hasChanges', () => {
  it('reports no change for identical data, which is what makes the sync idempotent', () => {
    expect(hasChanges(stored(), toSyncableFields(swapiFilm))).toBe(false);
  });

  it('compares dates by instant, not by object identity', () => {
    const incoming = toSyncableFields(swapiFilm);
    const sameDateDifferentObject = stored({
      releaseDate: new Date('1977-05-25'),
    });

    expect(hasChanges(sameDateDifferentObject, incoming)).toBe(false);
  });

  it.each([
    ['title', { title: 'Renamed' }],
    ['openingCrawl', { openingCrawl: 'Rewritten' }],
    ['director', { director: 'Somebody else' }],
    ['producer', { producer: 'Somebody else' }],
    ['releaseDate', { releaseDate: new Date('1980-05-21') }],
  ])('detects a change in %s', (_field, difference) => {
    expect(hasChanges(stored(difference), toSyncableFields(swapiFilm))).toBe(
      true,
    );
  });
});
