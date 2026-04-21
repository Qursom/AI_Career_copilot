import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import {
  LlmInvalidOutputError,
  LlmTimeoutError,
  LlmUpstreamError,
} from '../llm/llm.interface';
import type { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import {
  ResumeAnalysisSchema,
  type ResumeAnalysis,
} from './resume.schema';

const SYSTEM_PROMPT = `You are a senior career coach and ATS specialist.

You MUST tailor every field to the TARGET ROLE the user provides. Do not give
generic frontend advice to a backend role, and vice versa. If the role is
"Backend Engineer (Node.js)", your strengths, improvements, missing skills,
optimized bullets, and ATS notes must all be Node.js / backend specific
(Node.js, TypeScript, NestJS/Express, PostgreSQL, Redis, Kafka/SQS, Docker,
Kubernetes, AWS, OpenTelemetry, CI/CD, OWASP / OAuth2). Apply the same
discipline for frontend, fullstack, mobile, data, ML, DevOps/SRE, and QA roles.

Analyze the resume and return STRICT JSON with the following keys:

- "roast": string
  Direct, specific critique tied to the target role. No generic phrases.
  Be honest but professional.

- "strengths": string[]
  3–5 concrete strengths actually visible in the resume that are relevant to
  the target role. Quote or name the specific technology / outcome.

- "improvements": string[]
  Concrete, actionable improvements for the target role. Focus on missing
  metrics, weak wording, structure issues, and role-specific signals the
  resume is lacking (e.g. p95 latency for backend, Core Web Vitals for
  frontend, MTTR for SRE, AUC/lift for ML).

- "missingSkills": string[]
  Up to 8 skills that are commonly expected for the target role but are
  absent from the resume. Order by importance for the role. Do NOT include
  skills the resume already mentions.

- "optimized": string
  Rewrite 4–6 high-impact bullets for the target role with strong action
  verbs, quantified impact, and keywords the target-role ATS will parse.
  Use "\\n" for newlines.

- "atsScore": number
  Integer 0–100. Score against the target role, not the resume in isolation.

- "atsNotes": string
  Explain the score in terms of the target role: which keywords were present,
  which were missing, and specific formatting / structure advice for ATS.

Rules:
- Return ONLY valid JSON
- No markdown, no explanations outside JSON
- No extra keys`;

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(private readonly llm: LlmService) {}

  async analyze(dto: AnalyzeResumeDto): Promise<ResumeAnalysis> {
    const userPrompt = this.buildUserPrompt(dto);

    try {
      return await this.llm.generateStructured({
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        schema: ResumeAnalysisSchema,
      });
    } catch (err) {
      this.handleLlmError(err, 'analyze');
    }
  }

  private buildUserPrompt(dto: AnalyzeResumeDto): string {
    const lines = [`RESUME:\n${dto.resume}`];
    if (dto.role) {
      lines.push(
        `\nTARGET ROLE: ${dto.role}`,
        `Tailor EVERY field (roast, strengths, improvements, missingSkills, optimized, atsScore, atsNotes) to this exact role. Do not output generic advice. If the role is backend-oriented, do not suggest frontend skills like accessibility or Core Web Vitals, and vice-versa.`,
      );
    } else {
      lines.push(
        `\nNo target role provided. Infer the most likely role from the resume content and state your inference briefly in "atsNotes" before tailoring the rest of the response.`,
      );
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
      this.logger.error(`resume.${op}: upstream error: ${err.message}`);
      throw new ServiceUnavailableException({
        message: 'The AI provider is currently unavailable.',
        error: 'LLM_UPSTREAM',
      });
    }
    throw err as Error;
  }
}
