import { ApiProperty } from '@nestjs/swagger';

export class JobMatchHistoryItemDto {
  @ApiProperty()
  contentHash!: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  score!: number;

  @ApiProperty({ description: 'First ~160 characters of the job description.' })
  jobPreview!: string;

  @ApiProperty({ description: 'ISO timestamp of when this pair was scored.' })
  createdAt!: string;
}
