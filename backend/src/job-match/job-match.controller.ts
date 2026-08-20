import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JobMatchHistoryItemDto } from './dto/job-match-history.dto';
import { MatchResultDto } from './dto/match-result.dto';
import { ScoreMatchDto } from './dto/score-match.dto';
import { JobMatchService } from './job-match.service';

@ApiTags('job-match')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('job-match')
export class JobMatchController {
  constructor(private readonly service: JobMatchService) {}

  @Get('me')
  @ApiOperation({ summary: 'Most recent job match for the current user.' })
  @ApiResponse({ status: 200, type: MatchResultDto })
  @ApiUnauthorizedResponse({ description: 'Missing or expired session.' })
  getMine(@CurrentUser() user: AuthUser): Promise<MatchResultDto> {
    return this.service.getMine(user.userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Recent job matches scored by the current user.' })
  @ApiResponse({ status: 200, type: [JobMatchHistoryItemDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or expired session.' })
  listHistory(
    @CurrentUser() user: AuthUser,
  ): Promise<JobMatchHistoryItemDto[]> {
    return this.service.listHistory(user.userId);
  }

  @Post('score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Score a resume against a job description',
    description:
      'Returns a match percentage, strengths, gaps, and suggested edits. Identical JD+resume pairs are served from cache without charging coins. A new pair costs JOB_MATCH_COIN_COST (default 10) after a successful score.',
  })
  @ApiResponse({ status: 200, type: MatchResultDto })
  @ApiUnauthorizedResponse({ description: 'Missing or expired session.' })
  @ApiUnprocessableEntityResponse({ description: 'Input failed validation.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded.' })
  score(
    @CurrentUser() user: AuthUser,
    @Body() dto: ScoreMatchDto,
  ): Promise<MatchResultDto> {
    return this.service.score(user.userId, dto, user.email);
  }
}
