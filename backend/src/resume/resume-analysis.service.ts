import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  createResumeAnalysisGraph,
  type ResumeAnalysisGraph,
} from '../ai/langgraph/resume/graph';
import { normalizeResumeText } from '../ai/langgraph/resume/nodes/normalize-text.node';
import { CacheService } from '../cache/cache.service';
import { TypedConfigService } from '../config/typed-config.service';
import { LlmService } from '../llm/llm.service';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm/llm.interface';
import { userMessageForUpstreamError } from '../llm/llm-upstream.user-message';
import { mergeMockWithRagFields } from '../rag/merge-mock-rag';
import { RagService } from '../rag/rag.service';
import { InsufficientCoinsError } from '../users/users.store';
import { UsersService } from '../users/users.service';
import { PdfExtractService } from './pdf-extract.service';
import { ResumeFileService } from './resume-file.service';
import { ResumeAnalysisSchema, type ResumeAnalysis } from './resume.schema';
import { ResumeJobClient } from '../queue/resume-job.client';
import type { ResumeJobAccepted } from '../queue/resume-job.types';
import { RESUME_STORE, type ResumeStore } from './resume.store';

const IDEMPOTENCY_TTL_SECONDS = 60 * 60;

export type ResumeAnalysisResult = ResumeAnalysis & { interviewCoins: number };

@Injectable()
export class ResumeAnalysisService {
  private readonly logger = new Logger(ResumeAnalysisService.name);
  private readonly graph: ResumeAnalysisGraph;

  constructor(
    private readonly llm: LlmService,
    private readonly rag: RagService,
    private readonly users: UsersService,
    private readonly cache: CacheService,
    private readonly pdf: PdfExtractService,
    private readonly files: ResumeFileService,
    private readonly config: TypedConfigService,
    @Inject(RESUME_STORE) private readonly resumes: ResumeStore,
    @Optional()
    @Inject(forwardRef(() => ResumeJobClient))
    private readonly jobs?: ResumeJobClient,
  ) {
    this.graph = createResumeAnalysisGraph({
      pdf: this.pdf,
      llm: this.llm,
      rag: this.rag,
      maxRetries: this.config.get('RESUME_ANALYSIS_MAX_RETRIES'),
    });
  }

  /**
   * Parse a PDF into resume text without running analysis or charging coins.
   * Job Match (and any other paste-text flow) can fill a textarea from this.
   */
  async extractUpload(file: Express.Multer.File): Promise<{ text: string }> {
    await this.files.assertValidPdf(file);
    try {
      const raw = await this.pdf.extractFromPath(file.path);
      const text = normalizeResumeText(raw).slice(0, 20_000);
      if (text.length < 50) {
        throw new BadRequestException({
          message:
            'Could not extract enough text from this PDF. Try a text-based PDF or paste the resume.',
          error: 'PDF_EMPTY',
        });
      }
      return { text };
    } finally {
      await this.pdf.unlink(file.path);
    }
  }

  /**
   * PDF upload workflow: validate, then enqueue (when Redis is configured)
   * or run LangGraph inline.
   */
  async analyzeUpload(args: {
    userId: string;
    email?: string;
    file: Express.Multer.File;
    role?: string;
    requestId?: string;
  }): Promise<ResumeAnalysisResult | ResumeJobAccepted> {
    await this.files.assertValidPdf(args.file);
    return this.submit({
      userId: args.userId,
      email: args.email,
      filePath: args.file.path,
      role: args.role,
      requestId: args.requestId,
    });
  }

  /**
   * Text (or legacy multipart) workflow using the same LangGraph pipeline.
   */
  async analyzeForUser(args: {
    userId: string;
    email?: string;
    resumeText?: string;
    role?: string;
    file?: Express.Multer.File;
    requestId?: string;
  }): Promise<ResumeAnalysisResult | ResumeJobAccepted> {
    return this.submit({
      userId: args.userId,
      email: args.email,
      filePath: args.file?.path,
      rawText: args.resumeText,
      role: args.role,
      requestId: args.requestId,
    });
  }

  /**
   * HTTP entry: coin/idempotency checks, then enqueue or execute.
   * The worker calls {@link execute} directly so a queued job does not
   * re-enter this method.
   */
  async submit(args: {
    userId: string;
    email?: string;
    filePath?: string;
    rawText?: string;
    role?: string;
    requestId?: string;
  }): Promise<ResumeAnalysisResult | ResumeJobAccepted> {
    const requestId = args.requestId?.trim() || randomUUID();
    const payload = { ...args, requestId };

    await this.users.ensureUser(args.userId, args.email);

    const idemKey = this.idempotencyKey(args.userId, requestId);
    const prior = await this.safeCacheGet(idemKey);
    if (prior) {
      const parsed = this.parseCachedResult(prior);
      if (parsed) {
        this.logger.log(
          `resume_analysis_idempotent_hit userId=${args.userId} requestId=${requestId}`,
        );
        if (args.filePath) await this.pdf.unlink(args.filePath);
        return parsed;
      }
    }

    try {
      await this.users.assertSufficientCoins(args.userId);
    } catch (err) {
      if (args.filePath) await this.pdf.unlink(args.filePath);
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

    if (this.jobs) {
      try {
        return await this.jobs.enqueue(payload);
      } catch (err) {
        if (args.filePath) await this.pdf.unlink(args.filePath);
        throw err;
      }
    }

    return this.execute(payload);
  }

  /**
   * Runs LangGraph → persist → cache → charge. Called by the HTTP sync path
   * and by the BullMQ worker. Always deletes a temp PDF in `finally`.
   */
  async execute(args: {
    userId: string;
    email?: string;
    filePath?: string;
    rawText?: string;
    role?: string;
    requestId?: string;
  }): Promise<ResumeAnalysisResult> {
    const requestId = args.requestId?.trim() || randomUUID();
    const started = Date.now();

    await this.users.ensureUser(args.userId, args.email);

    const idemKey = this.idempotencyKey(args.userId, requestId);
    const prior = await this.safeCacheGet(idemKey);
    if (prior) {
      const parsed = this.parseCachedResult(prior);
      if (parsed) {
        this.logger.log(
          `resume_analysis_idempotent_hit userId=${args.userId} requestId=${requestId}`,
        );
        return parsed;
      }
    }

    try {
      await this.users.assertSufficientCoins(args.userId);
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

    this.logger.log(
      `resume_analysis_started userId=${args.userId} requestId=${requestId}`,
    );

    try {
      // Retrieval happens inside the graph (after text extraction), so the
      // evidence comes back on the final state rather than being computed here.
      const finalState = await this.graph.invoke({
        userId: args.userId,
        requestId,
        filePath: args.filePath,
        rawText: args.rawText,
        role: args.role,
        retryCount: 0,
        validationErrors: [],
        recommendations: [],
      });

      if (finalState.error || !finalState.resume) {
        this.throwGraphError(finalState.error);
      }

      let analysis = finalState.resume;
      const merged = mergeMockWithRagFields(
        this.llm.providerName,
        {
          marketSignals: finalState.ragMarketSignals,
          priorityGaps: finalState.ragPriorityGaps,
          citations: finalState.ragCitations,
        },
        {
          marketSignals: analysis.marketSignals,
          priorityGaps: analysis.priorityGaps,
          citations: analysis.citations,
        },
      );
      analysis = {
        ...analysis,
        marketSignals: merged.marketSignals,
        priorityGaps: merged.priorityGaps,
        citations: merged.citations,
      };

      const validated = ResumeAnalysisSchema.safeParse(analysis);
      if (!validated.success) {
        throw new ServiceUnavailableException({
          message:
            'The AI returned an unexpected shape. Please retry in a moment.',
          error: 'STRUCTURED_OUTPUT_INVALID',
        });
      }
      analysis = validated.data;

      // Charge before persisting: a 402 must never leave a stored analysis the
      // user did not pay for. The reverse order is compensated below instead.
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

      try {
        await this.resumes.upsert(args.userId, analysis);
        this.logger.log(
          `resume_persisted userId=${args.userId} requestId=${requestId}`,
        );
      } catch {
        this.logger.error(
          `resume_persist_failed userId=${args.userId} requestId=${requestId}`,
        );
        await this.refundAfterFailedPersist(args.userId, requestId);
        throw new ServiceUnavailableException({
          message: 'Could not save resume analysis. Please retry.',
          error: 'DATABASE_ERROR',
        });
      }

      await this.safeCacheSet(
        this.cacheKey(args.userId),
        JSON.stringify(analysis),
      );
      this.logger.log(
        `resume_cache_updated userId=${args.userId} requestId=${requestId}`,
      );

      const result: ResumeAnalysisResult = {
        ...analysis,
        interviewCoins: charged.interviewCoins,
      };

      await this.safeCacheSet(
        idemKey,
        JSON.stringify(result),
        IDEMPOTENCY_TTL_SECONDS,
      );

      this.logger.log(
        `resume_analysis_completed userId=${args.userId} requestId=${requestId} durationMs=${Date.now() - started}`,
      );

      return result;
    } catch (err) {
      return this.rethrowKnown(err);
    } finally {
      if (args.filePath) {
        await this.pdf.unlink(args.filePath);
      }
    }
  }

  /**
   * Best-effort compensation. If the refund itself fails the user is short the
   * cost of one analysis, so it is logged loudly enough to reconcile by hand.
   */
  private async refundAfterFailedPersist(
    userId: string,
    requestId: string,
  ): Promise<void> {
    try {
      await this.users.refundResumeAnalysis(userId);
      this.logger.log(
        `resume_charge_refunded userId=${userId} requestId=${requestId}`,
      );
    } catch (err) {
      this.logger.error(
        `resume_charge_refund_failed userId=${userId} requestId=${requestId} reason=${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private throwGraphError(code?: string): never {
    switch (code) {
      case 'EMPTY_RESUME':
        throw new BadRequestException({
          message:
            'Could not extract enough text from this resume. Try a text-based PDF or paste the resume.',
          error: 'EMPTY_RESUME',
        });
      case 'PDF_EXTRACTION_FAILED':
        throw new BadRequestException({
          message: 'Failed to parse PDF.',
          error: 'PDF_EXTRACTION_FAILED',
        });
      case 'MAX_RETRIES_EXCEEDED':
        throw new ServiceUnavailableException({
          message:
            'Resume analysis failed after multiple attempts. Please try again.',
          error: 'MAX_RETRIES_EXCEEDED',
        });
      default:
        throw new ServiceUnavailableException({
          message: 'Resume analysis failed. Please try again.',
          error: code || 'LLM_ERROR',
        });
    }
  }

  private rethrowKnown(err: unknown): never {
    if (
      err instanceof HttpException ||
      err instanceof BadRequestException ||
      err instanceof ServiceUnavailableException
    ) {
      throw err;
    }
    if (err instanceof LlmTimeoutError) {
      throw new ServiceUnavailableException({
        message: 'The AI provider took too long to respond. Please retry.',
        error: 'LLM_TIMEOUT',
      });
    }
    if (err instanceof LlmInvalidOutputError) {
      throw new ServiceUnavailableException({
        message:
          'The AI returned an unexpected shape. Please retry in a moment.',
        error: 'STRUCTURED_OUTPUT_INVALID',
      });
    }
    if (err instanceof LlmUpstreamError) {
      throw new ServiceUnavailableException({
        message: userMessageForUpstreamError(err),
        error: 'LLM_ERROR',
      });
    }
    throw err as Error;
  }

  private cacheKey(userId: string): string {
    return `resume:analysis:${userId}`;
  }

  private idempotencyKey(userId: string, requestId: string): string {
    return `resume:idem:${userId}:${requestId}`;
  }

  private async safeCacheGet(key: string): Promise<string | null> {
    try {
      return await this.cache.get(key);
    } catch {
      this.logger.warn(`resume_cache_get_failed key=${key}`);
      return null;
    }
  }

  private async safeCacheSet(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      if (ttlSeconds != null) {
        await this.cache.setWithTtl(key, value, ttlSeconds);
      } else {
        await this.cache.set(key, value);
      }
    } catch {
      this.logger.warn(`resume_cache_set_failed key=${key}`);
    }
  }

  private parseCachedResult(raw: string): ResumeAnalysisResult | null {
    try {
      const json: unknown = JSON.parse(raw);
      if (!json || typeof json !== 'object') return null;
      const coins = (json as { interviewCoins?: unknown }).interviewCoins;
      const parsed = ResumeAnalysisSchema.safeParse(json);
      if (!parsed.success || typeof coins !== 'number') return null;
      return { ...parsed.data, interviewCoins: coins };
    } catch {
      return null;
    }
  }
}
