import { NotFoundException } from '@nestjs/common';
import type { Film } from '../generated/prisma/client';
import { FilmSource } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { FilmsService } from './films.service';
import { QueryFilmsDto } from './dto/query-films.dto';

const FILM_ID = '22222222-2222-2222-2222-222222222222';

const filmFixture = (over: Partial<Film> = {}): Film => ({
  id: FILM_ID,
  episodeId: 4,
  title: 'A New Hope',
  openingCrawl: 'It is a period of civil war...',
  director: 'George Lucas',
  producer: 'Gary Kurtz, Rick McCallum',
  releaseDate: new Date('1977-05-25'),
  source: FilmSource.SWAPI,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const query = (over: Partial<QueryFilmsDto> = {}): QueryFilmsDto => ({
  page: 1,
  limit: 10,
  sortBy: 'episodeId',
  sortOrder: 'asc',
  ...over,
});

// The arguments a mocked Prisma call received, typed at the call site.
const argOf = <T>(mock: jest.Mock): T =>
  (mock.mock.calls as unknown[][])[0][0] as T;

describe('FilmsService', () => {
  let prisma: {
    film: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: FilmsService;

  beforeEach(() => {
    prisma = {
      film: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      // The real client resolves the array of queries; the mock just awaits it.
      $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
    };

    service = new FilmsService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns the page alongside its pagination metadata', async () => {
      prisma.film.findMany.mockResolvedValue([filmFixture()]);
      prisma.film.count.mockResolvedValue(42);

      const result = await service.findAll(query({ page: 2, limit: 10 }));

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({
        total: 42,
        page: 2,
        limit: 10,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('translates page and limit into skip and take', async () => {
      prisma.film.findMany.mockResolvedValue([]);
      prisma.film.count.mockResolvedValue(0);

      await service.findAll(query({ page: 3, limit: 20 }));

      expect(prisma.film.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('searches title and director case-insensitively', async () => {
      prisma.film.findMany.mockResolvedValue([]);
      prisma.film.count.mockResolvedValue(0);

      await service.findAll(query({ search: 'empire' }));

      expect(prisma.film.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: 'empire', mode: 'insensitive' } },
              { director: { contains: 'empire', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('applies no filter when nothing is searched for', async () => {
      prisma.film.findMany.mockResolvedValue([]);
      prisma.film.count.mockResolvedValue(0);

      await service.findAll(query());

      expect(prisma.film.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('orders by the requested field and direction', async () => {
      prisma.film.findMany.mockResolvedValue([]);
      prisma.film.count.mockResolvedValue(0);

      await service.findAll(query({ sortBy: 'title', sortOrder: 'desc' }));

      expect(prisma.film.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { title: 'desc' } }),
      );
    });

    it('counts with the same filter it lists with', async () => {
      prisma.film.findMany.mockResolvedValue([]);
      prisma.film.count.mockResolvedValue(0);

      await service.findAll(query({ search: 'hope' }));

      const listWhere = argOf<{ where: unknown }>(prisma.film.findMany).where;
      const countWhere = argOf<{ where: unknown }>(prisma.film.count).where;

      expect(countWhere).toEqual(listWhere);
    });
  });

  describe('findOne', () => {
    it('returns the film when it exists', async () => {
      prisma.film.findUnique.mockResolvedValue(filmFixture());

      await expect(service.findOne(FILM_ID)).resolves.toMatchObject({
        id: FILM_ID,
      });
    });

    it('throws 404 when it does not', async () => {
      prisma.film.findUnique.mockResolvedValue(null);

      await expect(service.findOne(FILM_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('marks films created through the API as LOCAL', async () => {
      prisma.film.create.mockResolvedValue(filmFixture());

      await service.create({
        title: 'A New Hope',
        openingCrawl: 'crawl',
        director: 'George Lucas',
        producer: 'Gary Kurtz',
        releaseDate: '1977-05-25',
      });

      expect(
        argOf<{ data: { source: FilmSource } }>(prisma.film.create).data.source,
      ).toBe(FilmSource.LOCAL);
    });

    it('stores releaseDate as a Date, not the incoming string', async () => {
      prisma.film.create.mockResolvedValue(filmFixture());

      await service.create({
        title: 'A New Hope',
        openingCrawl: 'crawl',
        director: 'George Lucas',
        producer: 'Gary Kurtz',
        releaseDate: '1977-05-25',
      });

      const { releaseDate } = argOf<{ data: { releaseDate: Date } }>(
        prisma.film.create,
      ).data;

      expect(releaseDate).toBeInstanceOf(Date);
      expect(releaseDate.toISOString()).toContain('1977-05-25');
    });
  });

  describe('update', () => {
    it('rejects an unknown id before touching the row', async () => {
      prisma.film.findUnique.mockResolvedValue(null);

      await expect(
        service.update(FILM_ID, { title: 'Renamed' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.film.update).not.toHaveBeenCalled();
    });

    it('leaves releaseDate untouched when the body omits it', async () => {
      prisma.film.findUnique.mockResolvedValue(filmFixture());
      prisma.film.update.mockResolvedValue(filmFixture({ title: 'Renamed' }));

      await service.update(FILM_ID, { title: 'Renamed' });

      expect(
        argOf<{ data: object }>(prisma.film.update).data,
      ).not.toHaveProperty('releaseDate');
    });

    it('converts releaseDate when the body carries it', async () => {
      prisma.film.findUnique.mockResolvedValue(filmFixture());
      prisma.film.update.mockResolvedValue(filmFixture());

      await service.update(FILM_ID, { releaseDate: '1980-05-21' });

      expect(
        argOf<{ data: { releaseDate: Date } }>(prisma.film.update).data
          .releaseDate,
      ).toBeInstanceOf(Date);
    });
  });

  describe('remove', () => {
    it('rejects an unknown id before deleting anything', async () => {
      prisma.film.findUnique.mockResolvedValue(null);

      await expect(service.remove(FILM_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.film.delete).not.toHaveBeenCalled();
    });

    it('deletes an existing film', async () => {
      prisma.film.findUnique.mockResolvedValue(filmFixture());
      prisma.film.delete.mockResolvedValue(filmFixture());

      await service.remove(FILM_ID);

      expect(prisma.film.delete).toHaveBeenCalledWith({
        where: { id: FILM_ID },
      });
    });
  });
});
