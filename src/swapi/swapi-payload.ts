// The shape SWAPI answers with. snake_case because that is what the upstream
// API returns; it is mapped to the local model in the sync service.
export interface SwapiFilm {
  title: string;
  episode_id: number;
  opening_crawl: string;
  director: string;
  producer: string;
  release_date: string;
}

const isSwapiFilm = (value: unknown): value is SwapiFilm => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const film = value as Record<string, unknown>;

  return (
    typeof film.title === 'string' &&
    typeof film.episode_id === 'number' &&
    typeof film.opening_crawl === 'string' &&
    typeof film.director === 'string' &&
    typeof film.producer === 'string' &&
    typeof film.release_date === 'string'
  );
};

// swapi.dev answers `{ count, next, previous, results }`, swapi.info answers a
// bare array. Both are accepted so SWAPI_BASE_URL can point at either mirror —
// which matters, because swapi.dev was unreachable while this was written.
export function normalizeFilmsPayload(payload: unknown): SwapiFilm[] {
  const candidates = Array.isArray(payload)
    ? payload
    : isEnvelope(payload)
      ? payload.results
      : null;

  if (candidates === null) {
    throw new Error(
      'Unexpected response from the Star Wars API: expected an array of films or an object with a "results" array.',
    );
  }

  const films = candidates.filter(isSwapiFilm);

  if (films.length === 0) {
    throw new Error('The Star Wars API returned no usable films.');
  }

  return films;
}

const isEnvelope = (value: unknown): value is { results: unknown[] } =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as { results?: unknown }).results);
