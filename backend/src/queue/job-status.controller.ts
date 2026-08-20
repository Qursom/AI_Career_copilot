import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ResumeJobStatusDto } from './dto/resume-job-status.dto';
import { ResumeJobClient } from './resume-job.client';

@ApiTags('resume')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('resume')
export class JobStatusController {
  constructor(private readonly jobs: ResumeJobClient) {}

  @Get('status/:jobId')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Poll a queued resume analysis',
    description:
      'Returns queued/active/completed/failed. Completed payloads match POST /resume/analyze.',
  })
  @ApiResponse({ status: 200, type: ResumeJobStatusDto })
  getStatus(
    @CurrentUser() user: AuthUser,
    @Param('jobId') jobId: string,
  ): Promise<ResumeJobStatusDto> {
    return this.jobs.getStatus(decodeURIComponent(jobId), user.userId);
  }
}
