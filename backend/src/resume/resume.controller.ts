import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { isResumeJobAccepted } from '../queue/resume-job.types';
import { ResumeJobAcceptedDto } from '../queue/dto/resume-job-status.dto';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import { ExtractedResumeTextDto } from './dto/extracted-resume-text.dto';
import { ResumeAnalysisDto } from './dto/resume-analysis.dto';
import { ResumeUploadDto } from './dto/resume-upload.dto';
import { ResumeService } from './resume.service';

function applyAnalyzeStatus(res: Response, body: unknown): void {
  if (isResumeJobAccepted(body)) {
    res.status(HttpStatus.ACCEPTED);
  }
}

function resolveRequestId(req: Request): string {
  const idem =
    req.header('idempotency-key')?.trim() ||
    req.header('x-idempotency-key')?.trim();
  if (idem && idem.length <= 128) return idem;
  return req.requestId ?? randomUUID();
}

@ApiTags('resume')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('resume')
export class ResumeController {
  constructor(private readonly service: ResumeService) {}

  @Get('me')
  @ApiOperation({ summary: 'Cached or stored analysis for the current user.' })
  @ApiResponse({ status: 200, type: ResumeAnalysisDto })
  getMine(@CurrentUser() user: AuthUser): Promise<ResumeAnalysisDto> {
    return this.service.getMine(user.userId);
  }

  @Post('extract')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('resume'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resume'],
      properties: {
        resume: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Extract plain text from a PDF resume',
    description:
      'Multipart field "resume" (PDF). Returns parsed text only — no LangGraph analysis and no coin charge. Used by Job Match to fill the resume textarea.',
  })
  @ApiResponse({ status: 200, type: ExtractedResumeTextDto })
  @ApiUnprocessableEntityResponse({ description: 'Input failed validation.' })
  extract(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ExtractedResumeTextDto> {
    return this.service.extractUpload(file);
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('resume'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resume'],
      properties: {
        resume: { type: 'string', format: 'binary' },
        role: { type: 'string' },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload a PDF resume for LangGraph analysis',
    description:
      'Multipart field "resume" (PDF, max RESUME_MAX_FILE_SIZE_MB — 20 MB by default). Inline analysis returns 200. When RESUME_QUEUE_ENABLED=true this returns 202 + jobId; poll GET /resume/status/:jobId. Costs 10 coins after success.',
  })
  @ApiResponse({ status: 200, type: ResumeAnalysisDto })
  @ApiAcceptedResponse({ type: ResumeJobAcceptedDto })
  @ApiUnprocessableEntityResponse({ description: 'Input failed validation.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded.' })
  async upload(
    @CurrentUser() user: AuthUser,
    @Body() dto: ResumeUploadDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResumeAnalysisDto | ResumeJobAcceptedDto> {
    const body = await this.service.analyzeUpload({
      userId: user.userId,
      email: user.email,
      file,
      role: dto.role,
      requestId: resolveRequestId(req),
    });
    applyAnalyzeStatus(res, body);
    return body;
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: AnalyzeResumeDto, required: false })
  @ApiOperation({
    summary: 'Analyze a resume',
    description:
      'JSON body with resume text, or multipart PDF field "file". Same pipeline as /upload. Inline analysis returns 200. When RESUME_QUEUE_ENABLED=true this returns 202 + jobId; poll GET /resume/status/:jobId. Costs 10 coins after success.',
  })
  @ApiResponse({ status: 200, type: ResumeAnalysisDto })
  @ApiAcceptedResponse({ type: ResumeJobAcceptedDto })
  @ApiUnprocessableEntityResponse({ description: 'Input failed validation.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded.' })
  async analyze(
    @CurrentUser() user: AuthUser,
    @Body() dto: AnalyzeResumeDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResumeAnalysisDto | ResumeJobAcceptedDto> {
    const body = await this.service.analyzeForUser({
      userId: user.userId,
      email: user.email,
      dto,
      file,
      requestId: resolveRequestId(req),
    });
    applyAnalyzeStatus(res, body);
    return body;
  }
}
