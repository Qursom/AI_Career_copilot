import { ApiProperty } from '@nestjs/swagger';

export class ResumeAnalysisDto {
  @ApiProperty({ required: false })
  fullName!: string;

  @ApiProperty({ required: false })
  email!: string;

  @ApiProperty({ required: false })
  phone!: string;

  @ApiProperty({ required: false })
  summary!: string;

  @ApiProperty({ type: [String], required: false })
  skills!: string[];

  @ApiProperty({ type: [String], required: false })
  projects!: string[];

  @ApiProperty({ type: [String], required: false })
  experience!: string[];

  @ApiProperty({ type: [String], required: false })
  education!: string[];

  @ApiProperty({
    description: 'Honest, direct roast of the weakest parts of the resume.',
  })
  roast!: string;

  @ApiProperty({
    description: 'Clear strengths identified in the resume.',
    type: [String],
    example: [
      '5+ years of TypeScript & React with shipped product impact.',
      'Measured outcomes on every recent role (conversion lift, latency wins).',
    ],
  })
  strengths!: string[];

  @ApiProperty({ type: [String], required: false })
  weaknesses!: string[];

  @ApiProperty({
    description:
      'Concrete, actionable improvements. Missing metrics, weak wording, structure.',
    type: [String],
    example: [
      'Quantify mentoring impact — add direct reports and promotions.',
      'Replace "responsible for" with action verbs and outcomes.',
    ],
  })
  improvements!: string[];

  @ApiProperty({ type: [String], required: false })
  recommendations!: string[];

  @ApiProperty({
    description: 'Important skills missing for the target role.',
    type: [String],
    example: ['GraphQL', 'Accessibility (WCAG 2.2)', 'Design systems at scale'],
  })
  missingSkills!: string[];

  @ApiProperty({ required: false })
  suggestedJobRole!: string;

  @ApiProperty({
    description:
      'Labor-market signals when retrieval is available; empty until a vector store is wired.',
    type: [String],
    required: false,
  })
  marketSignals!: string[];

  @ApiProperty({
    description: 'Priority role gaps grounded in retrieved dataset evidence.',
    type: [String],
    required: false,
  })
  priorityGaps!: string[];

  @ApiProperty({
    description: 'Sources used to ground market-aware skill guidance.',
    type: [String],
    required: false,
  })
  citations!: string[];

  @ApiProperty({
    description: 'Rewritten, ATS-friendly version of the key bullets.',
  })
  optimized!: string;

  @ApiProperty({
    description: 'ATS compatibility score on a 0–100 scale.',
    minimum: 0,
    maximum: 100,
  })
  atsScore!: number;

  @ApiProperty({ description: 'Notes explaining the ATS score and fixes.' })
  atsNotes!: string;

  @ApiProperty({
    required: false,
    description: 'Remaining interview coins after this run.',
  })
  interviewCoins?: number;
}
