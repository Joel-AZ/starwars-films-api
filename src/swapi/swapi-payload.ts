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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;

// The three mirrors disagree about where the list lives:
//
//   swapi.info   [ { title, ... } ]
//   swapi.dev    { results: [ { title, ... } ] }
//   swapi.tech   { result:  [ { properties: { title, ... } } ] }
//
// All three are accepted, so SWAPI_BASE_URL can point at any of them — which
// matters, because swapi.dev has been unreachable.
function extractList(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload as unknown[];
  }

  const envelope = asRecord(payload);

  if (!envelope) {
    return null;
  }

  for (const key of ['results', 'result'] as const) {
    const value = envelope[key];

    if (Array.isArray(value)) {
      return value as unknown[];
    }
  }

  return null;
}

// swapi.tech nests the film under `properties` and keeps ids and metadata as
// siblings; the other mirrors put the fields at the top level.
const unwrap = (item: unknown): unknown => {
  const record = asRecord(item);
  const properties = record ? asRecord(record.properties) : null;

  return properties ?? item;
};

export function normalizeFilmsPayload(payload: unknown): SwapiFilm[] {
  const candidates = extractList(payload);

  if (candidates === null) {
    throw new Error(
      'Unexpected response from the Star Wars API: expected an array of films or an object with a "result" or "results" array.',
    );
  }

  const films = candidates.map(unwrap).filter(isSwapiFilm);

  if (films.length === 0) {
    throw new Error('The Star Wars API returned no usable films.');
  }

  return films;
}
