import { Injectable, NotFoundException } from '@nestjs/common';
import type { Film } from '../generated/prisma/client';
import { FilmSource } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFilmDto } from './dto/create-film.dto';
import { PaginatedFilmsDto } from './dto/paginated-films.dto';
import { QueryFilmsDto } from './dto/query-films.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { buildPaginationMeta, toSkip } from './pagination-math';

@Injectable()
export class FilmsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryFilmsDto): Promise<PaginatedFilmsDto> {
    const where = query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' as const } },
            {
              director: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};

    // One round trip for the page and its total: without the transaction a
    // concurrent write could make `total` disagree with `data`.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.film.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: toSkip(query.page, query.limit),
        take: query.limit,
      }),
      this.prisma.film.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, query.page, query.limit) };
  }

  async findOne(id: string): Promise<Film> {
    const film = await this.prisma.film.findUnique({ where: { id } });

    if (!film) {
      throw new NotFoundException(`No film with id ${id}.`);
    }

    return film;
  }

  create(dto: CreateFilmDto): Promise<Film> {
    return this.prisma.film.create({
      data: {
        ...dto,
        releaseDate: new Date(dto.releaseDate),
        source: FilmSource.LOCAL,
      },
    });
  }

  async update(id: string, dto: UpdateFilmDto): Promise<Film> {
    await this.findOne(id);

    return this.prisma.film.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.releaseDate ? { releaseDate: new Date(dto.releaseDate) } : {}),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.film.delete({ where: { id } });
  }
}
