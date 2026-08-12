import { ServiceUnavailableException } from '@nestjs/common';
import request from 'supertest';
import { FilmSource } from '../src/generated/prisma/enums';
import type { SwapiFilm } from '../src/swapi/swapi-payload';
import { SwapiClient } from '../src/swapi/swapi.client';
import { loginAsAdmin, registerUser } from './auth-helper';
import { createTestApp, TestContext } from './create-app';

const UPSTREAM_FILMS: SwapiFilm[] = [
  {
    title: 'A New Hope',
    episode_id: 4,
    opening_crawl: 'It is a period of civil war...',
    director: 'George Lucas',
    producer: 'Gary Kurtz, Rick McCallum',
    release_date: '1977-05-25',
  },
  {
    title: 'The Empire Strikes Back',
    episode_id: 5,
    opening_crawl: 'It is a dark time for the Rebellion...',
    director: 'Irvin Kershner',
    producer: 'Gary Kurtz, Rick McCallum',
    release_date: '1980-05-21',
  },
];

interface SyncBody {
  created: number;
  updated: number;
  unchanged: number;
  received: number;
  durationMs: number;
}

// The upstream API is never called: a stub stands in for the client, so the
// suite is deterministic and works offline.
const fetchFilms = jest.fn();

describe('SWAPI synchronization (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  const server = () => ctx.app.getHttpServer();

  const sync = () =>
    request(server())
      .post('/api/films/sync')
      .set('Authorization', `Bearer ${adminToken}`);

  beforeAll(async () => {
    ctx = await createTestApp((builder) =>
      builder.overrideProvider(SwapiClient).useValue({ fetchFilms }),
    );
  });

  beforeEach(async () => {
    fetchFilms.mockReset();
    fetchFilms.mockResolvedValue(UPSTREAM_FILMS);

    await ctx.prisma.film.deleteMany();
    await ctx.prisma.user.deleteMany();

    adminToken = await loginAsAdmin(ctx);
    userToken = await registerUser(ctx);
  });

  afterAll(async () => {
    await ctx.prisma.film.deleteMany();
    await ctx.prisma.user.deleteMany();
    await ctx.app.close();
  });

  describe('authorization', () => {
    it('rejects a regular user with 403', async () => {
      await request(server())
        .post('/api/films/sync')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      await expect(ctx.prisma.film.count()).resolves.toBe(0);
    });

    it('rejects an anonymous request with 401', async () => {
      await request(server()).post('/api/films/sync').expect(401);
    });
  });

  describe('importing', () => {
    it('imports every upstream film and reports what it did', async () => {
      const response = await sync().expect(200);
      const body = response.body as SyncBody;

      expect(body).toMatchObject({
        created: 2,
        updated: 0,
        unchanged: 0,
        received: 2,
      });
      expect(body.durationMs).toEqual(expect.any(Number));
    });

    it('stores the films with their episode number and SWAPI as the source', async () => {
      await sync().expect(200);

      const film = await ctx.prisma.film.findUnique({
        where: { episodeId: 4 },
      });

      expect(film).toMatchObject({
        title: 'A New Hope',
        director: 'George Lucas',
        source: FilmSource.SWAPI,
      });
    });

    it('maps the snake_case payload onto the local columns', async () => {
      await sync().expect(200);

      const film = await ctx.prisma.film.findUnique({
        where: { episodeId: 5 },
      });

      expect(film?.openingCrawl).toBe('It is a dark time for the Rebellion...');
      expect(film?.releaseDate.toISOString()).toContain('1980-05-21');
    });
  });

  describe('idempotency', () => {
    it('changes nothing when run twice in a row', async () => {
      await sync().expect(200);

      const response = await sync().expect(200);

      expect(response.body as SyncBody).toMatchObject({
        created: 0,
        updated: 0,
        unchanged: 2,
      });
      await expect(ctx.prisma.film.count()).resolves.toBe(2);
    });

    it('updates a film whose upstream data changed, without duplicating it', async () => {
      await sync().expect(200);

      fetchFilms.mockResolvedValue([
        { ...UPSTREAM_FILMS[0], director: 'George Lucas (remastered)' },
        UPSTREAM_FILMS[1],
      ]);

      const response = await sync().expect(200);

      expect(response.body as SyncBody).toMatchObject({
        created: 0,
        updated: 1,
        unchanged: 1,
      });
      await expect(ctx.prisma.film.count()).resolves.toBe(2);

      const film = await ctx.prisma.film.findUnique({
        where: { episodeId: 4 },
      });
      expect(film?.director).toBe('George Lucas (remastered)');
    });

    it('creates only what is new when the upstream catalogue grows', async () => {
      await sync().expect(200);

      fetchFilms.mockResolvedValue([
        ...UPSTREAM_FILMS,
        {
          title: 'Return of the Jedi',
          episode_id: 6,
          opening_crawl: 'Luke Skywalker has returned...',
          director: 'Richard Marquand',
          producer: 'Howard Kazanjian',
          release_date: '1983-05-25',
        },
      ]);

      const response = await sync().expect(200);

      expect(response.body as SyncBody).toMatchObject({
        created: 1,
        unchanged: 2,
      });
    });

    it('leaves locally created films alone', async () => {
      const local = await ctx.prisma.film.create({
        data: {
          title: 'A fan edit',
          openingCrawl: 'Not canon.',
          director: 'Nobody',
          producer: 'Nobody',
          releaseDate: new Date('2001-01-01'),
          source: FilmSource.LOCAL,
        },
      });

      await sync().expect(200);

      const stored = await ctx.prisma.film.findUnique({
        where: { id: local.id },
      });

      expect(stored).toMatchObject({
        title: 'A fan edit',
        source: FilmSource.LOCAL,
      });
    });
  });

  describe('when the upstream API misbehaves', () => {
    it('answers 503 instead of a misleading success', async () => {
      fetchFilms.mockRejectedValue(
        new ServiceUnavailableException('The Star Wars API is unreachable.'),
      );

      await sync().expect(503);
    });

    it('leaves the catalogue untouched when the import fails', async () => {
      await sync().expect(200);

      fetchFilms.mockRejectedValue(
        new ServiceUnavailableException('The Star Wars API is unreachable.'),
      );
      await sync().expect(503);

      await expect(ctx.prisma.film.count()).resolves.toBe(2);
    });
  });
});
