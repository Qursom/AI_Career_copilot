import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import { ResumeAnalysisDto } from './dto/resume-analysis.dto';
import { ResumeService } from './resume.service';

@ApiTags('resume')
@Controller('resume')
export class ResumeController {
  constructor(private readonly service: ResumeService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze a resume',
    description:
      'Runs the AI copilot over a resume and returns a roast, rewritten bullets, and an ATS score.',
  })
  @ApiResponse({ status: 200, type: ResumeAnalysisDto })
  @ApiUnprocessableEntityResponse({ description: 'Input failed validation.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded.' })
  analyze(@Body() dto: AnalyzeResumeDto): Promise<ResumeAnalysisDto> {
    return this.service.analyze(dto);
  }
}
