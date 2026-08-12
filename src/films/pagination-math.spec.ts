import { buildPaginationMeta, toSkip } from './pagination-math';

describe('buildPaginationMeta', () => {
  it('reports the number of pages needed for a partial last page', () => {
    expect(buildPaginationMeta(42, 1, 10).totalPages).toBe(5);
  });

  it('flags a next page but no previous one on the first page', () => {
    expect(buildPaginationMeta(42, 1, 10)).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it('flags a previous page but no next one on the last page', () => {
    expect(buildPaginationMeta(42, 5, 10)).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('flags both when standing in the middle', () => {
    expect(buildPaginationMeta(42, 3, 10)).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('reports zero pages and no navigation for an empty result set', () => {
    expect(buildPaginationMeta(0, 1, 10)).toMatchObject({
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('does not offer a previous page when the result set is empty, whatever the page', () => {
    expect(buildPaginationMeta(0, 7, 10).hasPreviousPage).toBe(false);
  });

  it('does not offer a next page past the end', () => {
    expect(buildPaginationMeta(42, 99, 10).hasNextPage).toBe(false);
  });

  it('handles a result set that fits exactly in one page', () => {
    expect(buildPaginationMeta(10, 1, 10)).toMatchObject({
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});

describe('toSkip', () => {
  it('skips nothing on the first page', () => {
    expect(toSkip(1, 10)).toBe(0);
  });

  it('skips a whole page per page already passed', () => {
    expect(toSkip(3, 10)).toBe(20);
    expect(toSkip(2, 25)).toBe(25);
  });
});
