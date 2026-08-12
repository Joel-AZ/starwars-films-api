import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FilmSource } from '../../generated/prisma/enums';

export class FilmResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ example: 4, nullable: true })
  episodeId!: number | null;

  @ApiProperty({ example: 'A New Hope' })
  title!: string;

  @ApiProperty({ example: 'It is a period of civil war...' })
  openingCrawl!: string;

  @ApiProperty({ example: 'George Lucas' })
  director!: string;

  @ApiProperty({ example: 'Gary Kurtz, Rick McCallum' })
  producer!: string;

  @ApiProperty({ example: '1977-05-25T00:00:00.000Z', format: 'date-time' })
  releaseDate!: Date;

  @ApiProperty({
    enum: FilmSource,
    enumName: 'FilmSource',
    example: FilmSource.SWAPI,
    description:
      'SWAPI for films imported from the public Star Wars API, LOCAL for films created through this API.',
  })
  source!: FilmSource;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
