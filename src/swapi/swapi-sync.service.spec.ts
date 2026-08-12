import type { Film } from '../generated/prisma/client';
import { FilmSource } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SwapiSyncService } from './swapi-sync.service';
import type { SwapiFilm } from './swapi-payload';
import { SwapiClient } from './swapi.client';
import { toSyncableFields } from './sync-diff';

const swapiFilm = (over: Partial<SwapiFilm> = {}): SwapiFilm => ({
  title: 'A New Hope',
  episode_id: 4,
  opening_crawl: 'It is a period of civil war...',
  director: 'George Lucas',
  producer: 'Gary Kurtz, Rick McCallum',
  release_date: '1977-05-25',
  ...over,
});

const storedFrom = (film: SwapiFilm, over: Partial<Film> = {}): Film => ({
  id: `id-${film.episode_id}`,
  episodeId: film.episode_id,
  source: FilmSource.SWAPI,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...toSyncableFields(film),
  ...over,
});

const argOf = <T>(mock: jest.Mock, call = 0): T =>
  (mock.mock.calls as unknown[][])[call][0] as T;

describe('SwapiSyncService', () => {
  let client: { fetchFilms: jest.Mock };
  let prisma: {
    film: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let service: SwapiSyncService;

  beforeEach(() => {
    client = { fetchFilms: jest.fn() };
    prisma = {
      film: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new SwapiSyncService(
      client as unknown as SwapiClient,
      prisma as unknown as PrismaService,
    );
  });

  it('creates every film on an empty database', async () => {
    client.fetchFilms.mockResolvedValue([
      swapiFilm(),
      swapiFilm({ episode_id: 5, title: 'The Empire Strikes Back' }),
    ]);
    prisma.film.findUnique.mockResolvedValue(null);

    const report = await service.sync();

    expect(report).toMatchObject({
      created: 2,
      updated: 0,
      unchanged: 0,
      received: 2,
    });
    expect(prisma.film.create).toHaveBeenCalledTimes(2);
  });

  it('marks imported films as coming from SWAPI', async () => {
    client.fetchFilms.mockResolvedValue([swapiFilm()]);
    prisma.film.findUnique.mockResolvedValue(null);

    await service.sync();

    expect(
      argOf<{ data: { source: FilmSource; episodeId: number } }>(
        prisma.film.create,
      ).data,
    ).toMatchObject({ source: FilmSource.SWAPI, episodeId: 4 });
  });

  it('changes nothing on a second run: the whole point of the sync', async () => {
    const film = swapiFilm();
    client.fetchFilms.mockResolvedValue([film]);
    prisma.film.findUnique.mockResolvedValue(storedFrom(film));

    const report = await service.sync();

    expect(report).toMatchObject({ created: 0, updated: 0, unchanged: 1 });
    expect(prisma.film.create).not.toHaveBeenCalled();
    expect(prisma.film.update).not.toHaveBeenCalled();
  });

  it('updates only the films whose upstream data changed', async () => {
    const unchangedFilm = swapiFilm();
    const changedFilm = swapiFilm({ episode_id: 5, title: 'New title' });

    client.fetchFilms.mockResolvedValue([unchangedFilm, changedFilm]);
    prisma.film.findUnique
      .mockResolvedValueOnce(storedFrom(unchangedFilm))
      .mockResolvedValueOnce(
        storedFrom(changedFilm, { title: 'The old title' }),
      );

    const report = await service.sync();

    expect(report).toMatchObject({ created: 0, updated: 1, unchanged: 1 });
    expect(prisma.film.update).toHaveBeenCalledTimes(1);
  });

  it('never overwrites the episode number or the source when updating', async () => {
    const film = swapiFilm();
    client.fetchFilms.mockResolvedValue([film]);
    prisma.film.findUnique.mockResolvedValue(
      storedFrom(film, { title: 'Stale title' }),
    );

    await service.sync();

    const { data } = argOf<{ data: Record<string, unknown> }>(
      prisma.film.update,
    );

    expect(data).not.toHaveProperty('episodeId');
    expect(data).not.toHaveProperty('source');
  });

  it('matches films by episode number, not by title', async () => {
    client.fetchFilms.mockResolvedValue([swapiFilm({ episode_id: 6 })]);
    prisma.film.findUnique.mockResolvedValue(null);

    await service.sync();

    expect(prisma.film.findUnique).toHaveBeenCalledWith({
      where: { episodeId: 6 },
    });
  });

  it('reports how long it took', async () => {
    client.fetchFilms.mockResolvedValue([swapiFilm()]);
    prisma.film.findUnique.mockResolvedValue(null);

    const report = await service.sync();

    expect(report.durationMs).toEqual(expect.any(Number));
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('lets an upstream failure surface instead of reporting a successful sync', async () => {
    client.fetchFilms.mockRejectedValue(new Error('upstream is down'));

    await expect(service.sync()).rejects.toThrow('upstream is down');
    expect(prisma.film.create).not.toHaveBeenCalled();
  });
});
