import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import type { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import { ResumeAnalysisService } from './resume-analysis.service';
import { ResumeAnalysisSchema, type ResumeAnalysis } from './resume.schema';
import { RESUME_STORE, type ResumeStore } from './resume.store';

/**
 * Public resume façade: GET cache/store + delegates analysis to LangGraph service.
 */
@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private readonly analysis: ResumeAnalysisService,
    private readonly cache: CacheService,
    @Inject(RESUME_STORE) private readonly resumes: ResumeStore,
  ) {}

  analyzeForUser(args: {
    userId: string;
    email?: string;
    dto: AnalyzeResumeDto;
    file?: Express.Multer.File;
    requestId?: string;
  }): Promise<ResumeAnalysis & { interviewCoins: number }> {
    return this.analysis.analyzeForUser({
      userId: args.userId,
      email: args.email,
      resumeText: args.dto.resume?.trim(),
      role: args.dto.role,
      file: args.file,
      requestId: args.requestId,
    });
  }

  analyzeUpload(args: {
    userId: string;
    email?: string;
    file: Express.Multer.File;
    role?: string;
    requestId?: string;
  }): Promise<ResumeAnalysis & { interviewCoins: number }> {
    return this.analysis.analyzeUpload(args);
  }

  extractUpload(file: Express.Multer.File): Promise<{ text: string }> {
    return this.analysis.extractUpload(file);
  }

  async getMine(userId: string): Promise<ResumeAnalysis> {
    try {
      const cached = await this.cache.get(this.cacheKey(userId));
      if (cached) {
        const parsed = ResumeAnalysisSchema.safeParse(JSON.parse(cached));
        if (parsed.success) return parsed.data;
      }
    } catch {
      this.logger.warn(`resume_cache_miss_fallback userId=${userId}`);
    }

    const stored = await this.resumes.findByUserId(userId);
    if (!stored) {
      throw new NotFoundException({
        message: 'No resume analysis found for this user.',
        error: 'NOT_FOUND',
      });
    }

    try {
      await this.cache.set(this.cacheKey(userId), JSON.stringify(stored));
    } catch {
      this.logger.warn(`resume_cache_set_failed userId=${userId}`);
    }
    return stored;
  }

  private cacheKey(userId: string): string {
    return `resume:analysis:${userId}`;
  }
}
