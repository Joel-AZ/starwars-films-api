import { ApiProperty } from '@nestjs/swagger';
import { FilmResponseDto } from './film-response.dto';

export class PaginationMetaDto {
  @ApiProperty({
    example: 42,
    description: 'Matching rows, ignoring the page.',
  })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}

export class PaginatedFilmsDto {
  @ApiProperty({ type: [FilmResponseDto] })
  data!: FilmResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
