import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { TypedConfigService } from '../config/typed-config.service';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm/llm.interface';
import { LlmService } from '../llm/llm.service';
import type { ScoreMatchDto } from './dto/score-match.dto';
import { MatchResultSchema, type MatchResult } from './job-match.schema';
import { RagService } from '../rag/rag.service';
import { userMessageForUpstreamError } from '../llm/llm-upstream.user-message';
import { InsufficientCoinsError } from '../users/users.store';
import { UsersService } from '../users/users.service';
import { jobMatchContentHash, jobPreview } from './content-hash';
import {
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchUserPrompt,
} from './job-match.prompt';
import { finalizeMatchResult } from './job-match.score';
import { JOB_MATCH_STORE, type JobMatchStore } from './job-match.store';

const LAST_MATCH_KEY_PREFIX = 'job-match:last:';
const HASH_MATCH_KEY_PREFIX = 'job-match:hash:';

export type JobMatchScoreResult = MatchResult & {
  interviewCoins: number;
  cached: boolean;
};

export interface JobMatchHistoryItem {
  contentHash: string;
  score: number;
  jobPreview: string;
  createdAt: string;
}

export interface JobMatchDetail extends JobMatchHistoryItem {
  jobDescription: string;
  resume: string;
}

@Injectable()
export class JobMatchService {
  private readonly logger = new Logger(JobMatchService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly rag: RagService,
    private readonly cache: CacheService,
    private readonly users: UsersService,
    private readonly config: TypedConfigService,
    @Inject(JOB_MATCH_STORE) private readonly matches: JobMatchStore,
  ) {}

  /**
   * `userId` is the Firebase UID resolved from the session by `AuthGuard` —
   * it is never taken from the request body.
   */
  async score(
    userId: string,
    dto: ScoreMatchDto,
    email?: string,
  ): Promise<JobMatchScoreResult> {
    await this.users.ensureUser(userId, email);
    const contentHash = jobMatchContentHash(dto.jobDescription, dto.resume);

    const cached = await this.lookupCached(userId, contentHash);
    if (cached) {
      try {
        await this.persistPair(userId, contentHash, cached, dto);
      } catch (err) {
        this.logger.warn(
          `job-match persist_inputs_failed userId=${userId} reason=${err instanceof Error ? err.message : String(err)}`,
        );
      }
      await this.rememberLast(userId, cached);
      const profile = await this.users.getMe(userId);
      this.logger.log(
        `job-match cache_hit userId=${userId} score=${cached.score}`,
      );
      return {
        ...cached,
        cached: true,
        interviewCoins: profile?.interviewCoins ?? 0,
      };
    }

    const cost = this.config.get('JOB_MATCH_COIN_COST');
    try {
      await this.users.assertSufficientCoins(userId, cost);
    } catch (err) {
      this.throwIfInsufficient(err);
    }

    const result = await this.runScore(dto);

    let charged: { interviewCoins: number };
    try {
      charged = await this.users.chargeJobMatch(userId);
    } catch (err) {
      this.throwIfInsufficient(err);
    }

    try {
      await this.persistPair(userId, contentHash, result, dto);
    } catch (err) {
      this.logger.error(
        `job-match persist_failed userId=${userId} reason=${err instanceof Error ? err.message : String(err)}`,
      );
      await this.refundAfterFailedPersist(userId);
      throw new ServiceUnavailableException({
        message: 'Could not save job match. Please retry.',
        error: 'DATABASE_ERROR',
      });
    }

    await this.rememberHashed(userId, contentHash, result);
    await this.rememberLast(userId, result);
    this.logger.log(`job-match scored score=${result.score} cached=false`);

    return {
      ...result,
      cached: false,
      interviewCoins: charged.interviewCoins,
    };
  }

  /** Most recent match for the signed-in user. */
  async getMine(userId: string): Promise<MatchResult> {
    const stored = await this.matches.findLatestByUserId(userId);
    if (stored) return stored.result;

    const raw = await this.cache.get(this.lastMatchKey(userId));
    if (raw) {
      const parsed = this.parseResult(raw);
      if (parsed) return parsed;
      this.logger.warn(`Discarding unparseable cached job match for a user`);
    }
    throw new NotFoundException({
      message: 'No job match found yet. Score a job description first.',
      error: 'NOT_FOUND',
    });
  }

  async listHistory(userId: string): Promise<JobMatchHistoryItem[]> {
    const rows = await this.matches.listByUserId(userId, 20);
    return rows.map((row) => this.toHistoryItem(row));
  }

  async getHistoryItem(
    userId: string,
    contentHash: string,
  ): Promise<JobMatchDetail> {
    const row = await this.matches.findByUserAndHash(userId, contentHash);
    if (!row) {
      throw new NotFoundException({
        message: 'That match is not in your history.',
        error: 'NOT_FOUND',
      });
    }
    return {
      ...this.toHistoryItem(row),
      jobDescription: row.jobDescription,
      resume: row.resume,
    };
  }

  private toHistoryItem(row: {
    contentHash: string;
    result: MatchResult;
    jobPreview: string;
    jobDescription?: string;
    createdAt: Date;
  }): JobMatchHistoryItem {
    const source = row.jobDescription?.trim()
      ? row.jobDescription
      : row.jobPreview;
    return {
      contentHash: row.contentHash,
      score: row.result.score,
      jobPreview: jobPreview(source),
      createdAt: row.createdAt.toISOString(),
    };
  }

  private persistPair(
    userId: string,
    contentHash: string,
    result: MatchResult,
    dto: ScoreMatchDto,
  ) {
    return this.matches.upsert({
      userId,
      contentHash,
      result,
      jobPreview: jobPreview(dto.jobDescription),
      jobDescription: dto.jobDescription,
      resume: dto.resume,
      createdAt: new Date(),
    });
  }

  private async lookupCached(
    userId: string,
    contentHash: string,
  ): Promise<MatchResult | null> {
    const raw = await this.cache.get(this.hashMatchKey(userId, contentHash));
    if (raw) {
      const parsed = this.parseResult(raw);
      if (parsed) return parsed;
    }
    const stored = await this.matches.findByUserAndHash(userId, contentHash);
    if (!stored) return null;
    await this.rememberHashed(userId, contentHash, stored.result);
    return stored.result;
  }

  private async rememberHashed(
    userId: string,
    contentHash: string,
    result: MatchResult,
  ): Promise<void> {
    await this.safeCacheSet(
      this.hashMatchKey(userId, contentHash),
      JSON.stringify(result),
    );
  }

  private async rememberLast(
    userId: string,
    result: MatchResult,
  ): Promise<void> {
    await this.safeCacheSet(this.lastMatchKey(userId), JSON.stringify(result));
  }

  private async safeCacheSet(key: string, value: string): Promise<void> {
    try {
      await this.cache.set(key, value);
    } catch (err) {
      this.logger.warn(
        `Could not cache job match: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private parseResult(raw: string): MatchResult | null {
    try {
      const parsed = MatchResultSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private lastMatchKey(userId: string): string {
    return `${LAST_MATCH_KEY_PREFIX}${userId}`;
  }

  private hashMatchKey(userId: string, contentHash: string): string {
    return `${HASH_MATCH_KEY_PREFIX}${userId}:${contentHash}`;
  }

  private throwIfInsufficient(err: unknown): never {
    if (err instanceof InsufficientCoinsError) {
      throw new HttpException(
        {
          message: err.message,
          error: 'INSUFFICIENT_COINS',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    throw err as Error;
  }

  private async refundAfterFailedPersist(userId: string): Promise<void> {
    try {
      await this.users.refundJobMatch(userId);
      this.logger.log(`job-match charge_refunded userId=${userId}`);
    } catch (err) {
      this.logger.error(
        `job-match charge_refund_failed userId=${userId} reason=${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async runScore(dto: ScoreMatchDto): Promise<MatchResult> {
    const ragContext = await this.rag.buildJobMatchContext({
      resume: dto.resume,
      jobDescription: dto.jobDescription,
    });
    const prompt = buildJobMatchUserPrompt({
      jobDescription: dto.jobDescription,
      resume: dto.resume,
      ragContext: ragContext.promptContext,
    });

    try {
      const result = await this.llm.generateStructured({
        system: JOB_MATCH_SYSTEM_PROMPT,
        prompt,
        schema: MatchResultSchema,
      });
      return finalizeMatchResult({
        llm: result,
        rag: {
          marketSignals: ragContext.marketSignals,
          priorityGaps: ragContext.priorityGaps,
          citations: ragContext.citations,
        },
        jobDescription: dto.jobDescription,
        resume: dto.resume,
      });
    } catch (err) {
      this.handleLlmError(err, 'score');
    }
  }

  private handleLlmError(err: unknown, op: string): never {
    if (err instanceof LlmTimeoutError) {
      this.logger.warn(`jobMatch.${op}: LLM timeout`);
      throw new ServiceUnavailableException({
        message: 'The AI provider took too long to respond. Please retry.',
        error: 'LLM_TIMEOUT',
      });
    }
    if (err instanceof LlmInvalidOutputError) {
      this.logger.error(`jobMatch.${op}: invalid LLM output: ${err.message}`);
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
        `jobMatch.${op}: upstream error: ${err.message}${causeLine}`,
      );
      throw new ServiceUnavailableException({
        message: userMessageForUpstreamError(err),
        error: 'LLM_UPSTREAM',
      });
    }
    throw err as Error;
  }
}
