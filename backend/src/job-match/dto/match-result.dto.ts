import { ApiProperty } from '@nestjs/swagger';

export class MatchResultDto {
  @ApiProperty({
    description: 'Match score on a 0–100 scale.',
    minimum: 0,
    maximum: 100,
  })
  score!: number;

  @ApiProperty({ type: [String], description: 'Resume signals that fit the JD.' })
  strengths!: string[];

  @ApiProperty({ type: [String], description: 'Requirements not covered.' })
  gaps!: string[];

  @ApiProperty({
    type: [String],
    description: 'Concrete edits the applicant should make.',
  })
  suggestions!: string[];
}
