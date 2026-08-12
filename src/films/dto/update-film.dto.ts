import { PartialType } from '@nestjs/swagger';
import { CreateFilmDto } from './create-film.dto';

// Every field optional, but validated with the same rules when present.
// PartialType from @nestjs/swagger (not @nestjs/mapped-types) so the Swagger
// metadata carries over too.
export class UpdateFilmDto extends PartialType(CreateFilmDto) {}
