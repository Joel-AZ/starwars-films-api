import { normalizeFilmsPayload, type SwapiFilm } from './swapi-payload';

const aFilm = (over: Partial<SwapiFilm> = {}): SwapiFilm => ({
  title: 'A New Hope',
  episode_id: 4,
  opening_crawl: 'It is a period of civil war...',
  director: 'George Lucas',
  producer: 'Gary Kurtz, Rick McCallum',
  release_date: '1977-05-25',
  ...over,
});

describe('normalizeFilmsPayload', () => {
  it('accepts a bare array, the shape swapi.info returns', () => {
    expect(normalizeFilmsPayload([aFilm()])).toHaveLength(1);
  });

  it('accepts the paginated envelope, the shape swapi.dev returns', () => {
    const payload = {
      count: 1,
      next: null,
      previous: null,
      results: [aFilm()],
    };

    expect(normalizeFilmsPayload(payload)).toHaveLength(1);
  });

  it('returns both mirrors identically', () => {
    const film = aFilm();

    expect(normalizeFilmsPayload([film])).toEqual(
      normalizeFilmsPayload({ results: [film] }),
    );
  });

  it('drops entries that are missing required fields', () => {
    const payload = [
      aFilm(),
      { title: 'Half a film' },
      aFilm({ episode_id: 5 }),
    ];

    expect(normalizeFilmsPayload(payload)).toHaveLength(2);
  });

  it('drops entries whose fields have the wrong type', () => {
    const payload = [aFilm(), aFilm({ episode_id: '5' as unknown as number })];

    expect(normalizeFilmsPayload(payload)).toHaveLength(1);
  });

  it('rejects a payload that is neither an array nor an envelope', () => {
    expect(() => normalizeFilmsPayload({ message: 'Not found' })).toThrow(
      /expected an array of films/,
    );
  });

  it('rejects null', () => {
    expect(() => normalizeFilmsPayload(null)).toThrow();
  });

  it('rejects an empty list rather than reporting a successful no-op sync', () => {
    expect(() => normalizeFilmsPayload([])).toThrow(/no usable films/);
  });

  it('rejects a list where nothing is a usable film', () => {
    expect(() => normalizeFilmsPayload([{ nope: true }])).toThrow(
      /no usable films/,
    );
  });
});
