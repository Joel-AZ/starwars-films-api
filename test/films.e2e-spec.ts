import request from 'supertest';
import { FilmSource } from '../src/generated/prisma/enums';
import { loginAsAdmin, registerUser } from './auth-helper';
import { createTestApp, TestContext } from './create-app';

const A_NEW_HOPE = {
  title: 'A New Hope',
  episodeId: 4,
  openingCrawl: 'It is a period of civil war...',
  director: 'George Lucas',
  producer: 'Gary Kurtz, Rick McCallum',
  releaseDate: '1977-05-25',
};

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

interface FilmBody {
  id: string;
  title: string;
  episodeId: number | null;
  source: string;
}

interface PaginatedBody {
  data: FilmBody[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

describe('Films (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  const server = () => ctx.app.getHttpServer();

  const seedFilm = (over: Partial<typeof A_NEW_HOPE> = {}) =>
    request(server())
      .post('/api/films')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...A_NEW_HOPE, ...over });

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
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

  describe('GET /api/films', () => {
    it('is public: no token required', async () => {
      await request(server()).get('/api/films').expect(200);
    });

    it('returns an empty page with coherent metadata when there are no films', async () => {
      const response = await request(server()).get('/api/films').expect(200);
      const body = response.body as PaginatedBody;

      expect(body.data).toEqual([]);
      expect(body.meta).toMatchObject({
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('paginates', async () => {
      await seedFilm({ title: 'A New Hope', episodeId: 4 }).expect(201);
      await seedFilm({ title: 'The Empire Strikes Back', episodeId: 5 }).expect(
        201,
      );
      await seedFilm({ title: 'Return of the Jedi', episodeId: 6 }).expect(201);

      const response = await request(server())
        .get('/api/films?page=2&limit=2')
        .expect(200);
      const body = response.body as PaginatedBody;

      expect(body.data).toHaveLength(1);
      expect(body.meta).toMatchObject({
        total: 3,
        page: 2,
        limit: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('searches by title, ignoring case', async () => {
      await seedFilm({ title: 'A New Hope', episodeId: 4 }).expect(201);
      await seedFilm({ title: 'The Empire Strikes Back', episodeId: 5 }).expect(
        201,
      );

      const response = await request(server())
        .get('/api/films?search=EMPIRE')
        .expect(200);
      const body = response.body as PaginatedBody;

      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('The Empire Strikes Back');
    });

    it('searches by director too', async () => {
      await seedFilm({ episodeId: 4, director: 'George Lucas' }).expect(201);
      await seedFilm({
        episodeId: 5,
        title: 'The Empire Strikes Back',
        director: 'Irvin Kershner',
      }).expect(201);

      const response = await request(server())
        .get('/api/films?search=kershner')
        .expect(200);

      expect((response.body as PaginatedBody).data).toHaveLength(1);
    });

    it('sorts by the requested field and direction', async () => {
      await seedFilm({ title: 'A New Hope', episodeId: 4 }).expect(201);
      await seedFilm({ title: 'The Empire Strikes Back', episodeId: 5 }).expect(
        201,
      );

      const response = await request(server())
        .get('/api/films?sortBy=episodeId&sortOrder=desc')
        .expect(200);

      expect((response.body as PaginatedBody).data[0].episodeId).toBe(5);
    });

    it('rejects an unsupported sort field with 400', async () => {
      await request(server()).get('/api/films?sortBy=password').expect(400);
    });

    it('rejects a limit above the cap with 400', async () => {
      await request(server()).get('/api/films?limit=1000').expect(400);
    });
  });

  describe('GET /api/films/:id', () => {
    let filmId: string;

    beforeEach(async () => {
      const response = await seedFilm().expect(201);
      filmId = (response.body as FilmBody).id;
    });

    it('lets a regular user through', async () => {
      const response = await request(server())
        .get(`/api/films/${filmId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect((response.body as FilmBody).title).toBe('A New Hope');
    });

    it('rejects an administrator with 403, per the brief', async () => {
      await request(server())
        .get(`/api/films/${filmId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('rejects an anonymous request with 401', async () => {
      await request(server()).get(`/api/films/${filmId}`).expect(401);
    });

    it('returns 404 for an id that does not exist', async () => {
      await request(server())
        .get(`/api/films/${UNKNOWN_ID}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('returns 400 for an id that is not a uuid', async () => {
      await request(server())
        .get('/api/films/not-a-uuid')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });

  describe('POST /api/films', () => {
    it('lets an administrator create a film', async () => {
      const response = await seedFilm().expect(201);
      const body = response.body as FilmBody;

      expect(body.title).toBe('A New Hope');
      expect(body.source).toBe(FilmSource.LOCAL);
    });

    it('rejects a regular user with 403', async () => {
      await request(server())
        .post('/api/films')
        .set('Authorization', `Bearer ${userToken}`)
        .send(A_NEW_HOPE)
        .expect(403);
    });

    it('rejects an anonymous request with 401', async () => {
      await request(server()).post('/api/films').send(A_NEW_HOPE).expect(401);
    });

    it('rejects a duplicate episode number with 409', async () => {
      await seedFilm().expect(201);
      await seedFilm({ title: 'A different film' }).expect(409);
    });

    it('accepts films without an episode number, and several of them', async () => {
      await seedFilm({ episodeId: undefined }).expect(201);
      await seedFilm({ episodeId: undefined, title: 'Another one' }).expect(
        201,
      );
    });

    it('rejects an invalid payload with 400', async () => {
      await request(server())
        .post('/api/films')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '', releaseDate: 'not-a-date' })
        .expect(400);
    });

    it('rejects unknown properties with 400', async () => {
      await request(server())
        .post('/api/films')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...A_NEW_HOPE, source: FilmSource.SWAPI })
        .expect(400);
    });
  });

  describe('PATCH /api/films/:id', () => {
    let filmId: string;

    beforeEach(async () => {
      const response = await seedFilm().expect(201);
      filmId = (response.body as FilmBody).id;
    });

    it('lets an administrator change one field and leaves the rest alone', async () => {
      const response = await request(server())
        .patch(`/api/films/${filmId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'A New Hope (Special Edition)' })
        .expect(200);
      const body = response.body as FilmBody;

      expect(body.title).toBe('A New Hope (Special Edition)');
      expect(body.episodeId).toBe(4);
    });

    it('rejects a regular user with 403', async () => {
      await request(server())
        .patch(`/api/films/${filmId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Nope' })
        .expect(403);
    });

    it('rejects an anonymous request with 401', async () => {
      await request(server())
        .patch(`/api/films/${filmId}`)
        .send({ title: 'Nope' })
        .expect(401);
    });

    it('returns 404 for an id that does not exist', async () => {
      await request(server())
        .patch(`/api/films/${UNKNOWN_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Nope' })
        .expect(404);
    });

    it('returns 409 when the new episode number is taken', async () => {
      await seedFilm({ title: 'The Empire Strikes Back', episodeId: 5 }).expect(
        201,
      );

      await request(server())
        .patch(`/api/films/${filmId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ episodeId: 5 })
        .expect(409);
    });
  });

  describe('DELETE /api/films/:id', () => {
    let filmId: string;

    beforeEach(async () => {
      const response = await seedFilm().expect(201);
      filmId = (response.body as FilmBody).id;
    });

    it('lets an administrator delete a film', async () => {
      await request(server())
        .delete(`/api/films/${filmId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await expect(
        ctx.prisma.film.count({ where: { id: filmId } }),
      ).resolves.toBe(0);
    });

    it('rejects a regular user with 403 and leaves the film in place', async () => {
      await request(server())
        .delete(`/api/films/${filmId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      await expect(
        ctx.prisma.film.count({ where: { id: filmId } }),
      ).resolves.toBe(1);
    });

    it('rejects an anonymous request with 401', async () => {
      await request(server()).delete(`/api/films/${filmId}`).expect(401);
    });

    it('returns 404 for an id that does not exist', async () => {
      await request(server())
        .delete(`/api/films/${UNKNOWN_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
