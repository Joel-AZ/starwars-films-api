import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorator';
import { Role } from '../generated/prisma/enums';
import { CreateFilmDto } from './dto/create-film.dto';
import { FilmResponseDto } from './dto/film-response.dto';
import { PaginatedFilmsDto } from './dto/paginated-films.dto';
import { QueryFilmsDto } from './dto/query-films.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { FilmsService } from './films.service';

@ApiTags('Films')
@Controller('films')
export class FilmsController {
  constructor(private readonly films: FilmsService) {}

  @Get()
  @ApiOperation({
    summary: 'List films',
    description:
      'Public: it is the only film endpoint the brief does not restrict. Paginated, searchable by title or director, and sortable.',
  })
  @ApiOkResponse({ type: PaginatedFilmsDto })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: QueryFilmsDto): Promise<PaginatedFilmsDto> {
    return this.films.findAll(query);
  }

  @Get(':id')
  @Auth(Role.USER)
  @ApiOperation({
    summary: 'Get one film',
    description:
      'Restricted to regular users, following the brief literally: an administrator gets 403 here. See the design notes in the README.',
  })
  @ApiOkResponse({ type: FilmResponseDto })
  @ApiNotFoundResponse({ description: 'No film with that id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FilmResponseDto> {
    return this.films.findOne(id);
  }

  @Post()
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a film' })
  @ApiCreatedResponse({ type: FilmResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'That episode number already exists' })
  create(@Body() dto: CreateFilmDto): Promise<FilmResponseDto> {
    return this.films.create(dto);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Update a film',
    description: 'Partial update: only the fields present in the body change.',
  })
  @ApiOkResponse({ type: FilmResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'No film with that id' })
  @ApiConflictResponse({ description: 'That episode number already exists' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFilmDto,
  ): Promise<FilmResponseDto> {
    return this.films.update(id, dto);
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a film' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'No film with that id' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.films.remove(id);
  }
}
