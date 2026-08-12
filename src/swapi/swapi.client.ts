import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeFilmsPayload, type SwapiFilm } from './swapi-payload';

const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class SwapiClient {
  private readonly logger = new Logger(SwapiClient.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config
      .getOrThrow<string>('SWAPI_BASE_URL')
      .replace(/\/+$/, '');
  }

  async fetchFilms(): Promise<SwapiFilm[]> {
    const url = `${this.baseUrl}/films`;

    let response: Response;

    try {
      response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      this.logger.error(`Could not reach ${url}`, cause);

      throw new ServiceUnavailableException(
        'The Star Wars API is unreachable right now. Try again later.',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `The Star Wars API answered ${response.status}.`,
      );
    }

    try {
      return normalizeFilmsPayload(await response.json());
    } catch (cause) {
      this.logger.error(`Unusable response from ${url}`, cause);

      throw new ServiceUnavailableException(
        'The Star Wars API answered with an unexpected payload.',
      );
    }
  }
}
