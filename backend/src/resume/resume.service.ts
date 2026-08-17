import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm/llm.interface';
import type { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import { ResumeAnalysisSchema, type ResumeAnalysis } from './resume.schema';
import { mergeMockWithRagFields } from '../rag/merge-mock-rag';
import { RagService } from '../rag/rag.service';
import { userMessageForUpstreamError } from '../llm/llm-upstream.user-message';
import { UsersService } from '../users/users.service';
import { InsufficientCoinsError } from '../users/users.store';
import { CacheService } from '../cache/cache.service';
import { PdfExtractService } from './pdf-extract.service';
import { RESUME_STORE, type ResumeStore } from './resume.store';

const SYSTEM_PROMPT = `You are an Expert ATS Resume Analyzer.

Evaluate the resume against Applicant Tracking System (ATS) standards and the
TARGET ROLE when provided. Tailor strengths, weaknesses, missing skills,
recommendations, and ATS notes to that role.

Return STRICT JSON with these keys:

- "fullName": string
- "email": string
- "phone": string
- "summary": string (professional summary)
- "skills": string[] (technical skills)
- "projects": string[]
- "experience": string[] (work experience highlights)
- "education": string[]
- "roast": string (direct, professional critique)
- "strengths": string[] (3–5 concrete strengths)
- "weaknesses": string[]
- "improvements": string[] (actionable ATS-oriented improvements)
- "recommendations": string[] (list of suggestions for the frontend)
- "missingSkills": string[] (up to 8 skills expected for the suggested/target role)
- "suggestedJobRole": string
- "marketSignals": string[]
- "priorityGaps": string[]
- "citations": string[]
- "optimized": string (4–6 rewritten bullets, use \\n)
- "atsScore": number (integer 0–100)
- "atsNotes": string

Rules:
- Return ONLY valid JSON
- No markdown, no explanations outside JSON
- No extra keys`;

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly rag: RagService,
    private readonly users: UsersService,
    private readonly cache: CacheService,
    private readonly pdf: PdfExtractService,
    @Inject(RESUME_STORE) private readonly resumes: ResumeStore,
  ) {}

  async analyzeForUser(args: {
    userId: string;
    email?: string;
    dto: AnalyzeResumeDto;
    file?: Express.Multer.File;
  }): Promise<ResumeAnalysis & { interviewCoins: number }> {
    await this.users.ensureUser(args.userId, args.email);

    let resumeText = args.dto.resume?.trim() ?? '';
    try {
      if (args.file) {
        resumeText = await this.pdf.extractText(args.file);
      }
      if (resumeText.length < 50) {
        throw new BadRequestException({
          message: 'resume must be between 50 and 20,000 characters.',
          error: 'VALIDATION_ERROR',
        });
      }

      let charged;
      try {
        charged = await this.users.chargeResumeAnalysis(args.userId);
      } catch (err) {
        if (err instanceof InsufficientCoinsError) {
          throw new HttpException(
            {
              message: err.message,
              error: 'INSUFFICIENT_COINS',
            },
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
        throw err;
      }

      const analysis = await this.analyze({
        resume: resumeText,
        role: args.dto.role,
      });
      await this.resumes.upsert(args.userId, analysis);
      await this.cache.set(this.cacheKey(args.userId), JSON.stringify(analysis));
      return { ...analysis, interviewCoins: charged.interviewCoins };
    } finally {
      if (args.file?.path) {
        await this.pdf.unlink(args.file.path);
      }
    }
  }

  async getMine(userId: string): Promise<ResumeAnalysis> {
    const cached = await this.cache.get(this.cacheKey(userId));
    if (cached) {
      const parsed = ResumeAnalysisSchema.safeParse(JSON.parse(cached));
      if (parsed.success) return parsed.data;
    }
    const stored = await this.resumes.findByUserId(userId);
    if (!stored) {
      throw new NotFoundException({
        message: 'No resume analysis found for this user.',
        error: 'NOT_FOUND',
      });
    }
    await this.cache.set(this.cacheKey(userId), JSON.stringify(stored));
    return stored;
  }

  async analyze(dto: AnalyzeResumeDto): Promise<ResumeAnalysis> {
    const ragContext = await this.rag.buildResumeContext({
      role: dto.role,
      resume: dto.resume ?? '',
    });
    const userPrompt = this.buildUserPrompt(dto, ragContext.promptContext);

    try {
      const result = await this.llm.generateStructured({
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        schema: ResumeAnalysisSchema,
      });
      const merged = mergeMockWithRagFields(
        this.llm.providerName,
        {
          marketSignals: ragContext.marketSignals,
          priorityGaps: ragContext.priorityGaps,
          citations: ragContext.citations,
        },
        {
          marketSignals: result.marketSignals,
          priorityGaps: result.priorityGaps,
          citations: result.citations,
        },
      );
      return {
        ...result,
        marketSignals: merged.marketSignals,
        priorityGaps: merged.priorityGaps,
        citations: merged.citations,
      };
    } catch (err) {
      this.handleLlmError(err, 'analyze');
    }
  }

  private cacheKey(userId: string): string {
    return `resume:analysis:${userId}`;
  }

  private buildUserPrompt(dto: AnalyzeResumeDto, ragContext: string): string {
    const lines = [`RESUME:\n${dto.resume}`];
    if (dto.role) {
      lines.push(
        `\nTARGET ROLE: ${dto.role}`,
        `Tailor EVERY field to this exact role.`,
      );
    } else {
      lines.push(
        `\nNo target role provided. Infer the most likely role and put it in "suggestedJobRole".`,
      );
    }
    if (ragContext) {
      lines.push(`\n${ragContext}`);
    }
    return lines.join('\n');
  }

  private handleLlmError(err: unknown, op: string): never {
    if (err instanceof LlmTimeoutError) {
      this.logger.warn(`resume.${op}: LLM timeout`);
      throw new ServiceUnavailableException({
        message: 'The AI provider took too long to respond. Please retry.',
        error: 'LLM_TIMEOUT',
      });
    }
    if (err instanceof LlmInvalidOutputError) {
      this.logger.error(`resume.${op}: invalid LLM output: ${err.message}`);
      throw new ServiceUnavailableException({
        message:
          'The AI returned an unexpected shape. Please retry in a moment.',
        error: 'LLM_INVALID_OUTPUT',
      });
    }
    if (err instanceof LlmUpstreamError) {
      const causeLine =
        err.cause instanceof Error ? ` | cause: ${err.cause.message}` : '';
      this.logger.error(
        `resume.${op}: upstream error: ${err.message}${causeLine}`,
      );
      throw new ServiceUnavailableException({
        message: userMessageForUpstreamError(err),
        error: 'LLM_UPSTREAM',
      });
    }
    throw err as Error;
  }
}
