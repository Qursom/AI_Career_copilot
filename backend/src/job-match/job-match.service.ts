import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm/llm.interface';
import { LlmService } from '../llm/llm.service';
import type { ScoreMatchDto } from './dto/score-match.dto';
import {
  MatchResultSchema,
  type MatchResult,
} from './job-match.schema';

const SYSTEM_PROMPT = `You are a senior recruiter and technical hiring manager. Score how well a resume matches a job description. Return STRICT JSON with:

- "score": integer 0–100 — overall match percentage.
- "strengths": array of strings (1–10) — resume signals that fit the JD.
- "gaps": array of strings (0–10) — requirements the resume does not cover.
- "suggestions": array of strings (0–10) — concrete bullet-level edits to raise the score.

Be specific. Quote terms from the JD where relevant. Do not include any other keys. Do not wrap in markdown fences.`;

@Injectable()
export class JobMatchService {
  private readonly logger = new Logger(JobMatchService.name);

  constructor(private readonly llm: LlmService) {}

  async score(dto: ScoreMatchDto): Promise<MatchResult> {
    const prompt =
      `JOB DESCRIPTION:\n${dto.jobDescription}\n\n` +
      `RESUME:\n${dto.resume}`;

    try {
      return await this.llm.generateStructured({
        system: SYSTEM_PROMPT,
        prompt,
        schema: MatchResultSchema,
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
      this.logger.error(`jobMatch.${op}: upstream error: ${err.message}`);
      throw new ServiceUnavailableException({
        message: 'The AI provider is currently unavailable.',
        error: 'LLM_UPSTREAM',
      });
    }
    throw err as Error;
  }
}
