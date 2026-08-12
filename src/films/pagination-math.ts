import { PaginationMetaDto } from './dto/paginated-films.dto';

// Pure: no database, no framework. Kept apart from the service so the edge
// cases (empty result set, last page, a page past the end) can be tested
// without spinning anything up.
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMetaDto {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && total > 0,
  };
}

export function toSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
