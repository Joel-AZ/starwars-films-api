import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { trimmed } from '../../common/transforms';

export class CreateFilmDto {
  @ApiProperty({ example: 'A New Hope', minLength: 1, maxLength: 200 })
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    maximum: 999,
    description:
      'Episode number. Unique across the catalogue and used to match films coming from SWAPI, so films created by hand can leave it out.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  episodeId?: number;

  @ApiProperty({ example: 'It is a period of civil war...' })
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  openingCrawl!: string;

  @ApiProperty({ example: 'George Lucas' })
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  director!: string;

  @ApiProperty({ example: 'Gary Kurtz, Rick McCallum' })
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  producer!: string;

  @ApiProperty({ example: '1977-05-25', format: 'date' })
  @IsDateString()
  releaseDate!: string;
}
