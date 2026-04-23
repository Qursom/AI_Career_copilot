import { ApiProperty } from '@nestjs/swagger';

export class MatchResultDto {
  @ApiProperty({
    description: 'Match score on a 0–100 scale.',
    minimum: 0,
    maximum: 100,
  })
  score!: number;

  @ApiProperty({
    type: [String],
    description: 'Resume signals that fit the JD.',
  })
  strengths!: string[];

  @ApiProperty({ type: [String], description: 'Requirements not covered.' })
  gaps!: string[];

  @ApiProperty({
    type: [String],
    description: 'Retrieved market signals used to ground fit evaluation.',
    required: false,
  })
  marketSignals!: string[];

  @ApiProperty({
    type: [String],
    description: 'Top market-priority gaps inferred from retrieved evidence.',
    required: false,
  })
  priorityGaps!: string[];

  @ApiProperty({
    type: [String],
    description: 'Source references for retrieved role expectations.',
    required: false,
  })
  citations!: string[];

  @ApiProperty({
    type: [String],
    description: 'Concrete edits the applicant should make.',
  })
  suggestions!: string[];
}
