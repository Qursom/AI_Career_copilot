import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResumeAnalysisDto } from '../../resume/dto/resume-analysis.dto';

export class ResumeJobAcceptedDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty({ enum: ['queued', 'active'] })
  status!: 'queued' | 'active';
}

export class ResumeJobErrorDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  message!: string;
}

export class ResumeJobProgressDto {
  @ApiProperty()
  step!: string;

  @ApiProperty()
  percent!: number;
}

export class ResumeJobStatusDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty({ enum: ['queued', 'active', 'completed', 'failed'] })
  status!: 'queued' | 'active' | 'completed' | 'failed';

  @ApiPropertyOptional({ type: ResumeJobProgressDto })
  progress?: ResumeJobProgressDto;

  @ApiPropertyOptional({ type: ResumeAnalysisDto })
  result?: ResumeAnalysisDto;

  @ApiPropertyOptional({ type: ResumeJobErrorDto })
  error?: ResumeJobErrorDto;
}
