import { ApiProperty } from '@nestjs/swagger';

export class SyncReportDto {
  @ApiProperty({ example: 6, description: 'Films that did not exist locally.' })
  created!: number;

  @ApiProperty({
    example: 1,
    description: 'Films whose upstream data had changed.',
  })
  updated!: number;

  @ApiProperty({
    example: 0,
    description: 'Films already identical to their upstream version.',
  })
  unchanged!: number;

  @ApiProperty({ example: 7, description: 'Films the upstream API returned.' })
  received!: number;

  @ApiProperty({ example: 412 })
  durationMs!: number;
}
