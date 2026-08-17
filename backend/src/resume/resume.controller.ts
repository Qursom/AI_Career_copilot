import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import { ResumeAnalysisDto } from './dto/resume-analysis.dto';
import { ResumeService } from './resume.service';

const uploadsDir = join(process.cwd(), 'uploads');
mkdirSync(uploadsDir, { recursive: true });

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

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname) || '.pdf'}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === 'application/pdf' ||
          file.originalname.toLowerCase().endsWith('.pdf');
        cb(ok ? null : new Error('Only PDF files are accepted'), ok);
      },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: AnalyzeResumeDto, required: false })
  @ApiOperation({
    summary: 'Analyze a resume',
    description:
      'JSON body with resume text, or multipart PDF field "file". Costs 10 interview coins.',
  })
  @ApiResponse({ status: 200, type: ResumeAnalysisDto })
  @ApiUnprocessableEntityResponse({ description: 'Input failed validation.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded.' })
  analyze(
    @CurrentUser() user: AuthUser,
    @Body() dto: AnalyzeResumeDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ResumeAnalysisDto> {
    return this.service.analyzeForUser({
      userId: user.userId,
      email: user.email,
      dto,
      file,
    });
  }
}
