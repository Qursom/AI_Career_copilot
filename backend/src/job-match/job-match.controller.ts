import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { MatchResultDto } from './dto/match-result.dto';
import { ScoreMatchDto } from './dto/score-match.dto';
import { JobMatchService } from './job-match.service';

@ApiTags('job-match')
@Controller('job-match')
export class JobMatchController {
  constructor(private readonly service: JobMatchService) {}

  @Post('score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Score a resume against a job description',
    description:
      'Returns a match percentage, strengths, gaps, and suggested edits.',
  })
  @ApiResponse({ status: 200, type: MatchResultDto })
  @ApiUnprocessableEntityResponse({ description: 'Input failed validation.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded.' })
  score(@Body() dto: ScoreMatchDto): Promise<MatchResultDto> {
    return this.service.score(dto);
  }
}
