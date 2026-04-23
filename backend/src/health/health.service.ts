import { Injectable } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { LlmService } from '../llm/llm.service';

export interface HealthReport {
  status: 'ok';
  env: string;
  version: string;
  uptime: number;
  timestamp: string;
  /** Which provider implementation is active (openai, gemini, mock). */
  llmProvider: string;
  /** Value of `LLM_PROVIDER` in env; if it differs from `llmProvider`, a key was missing and mock was used. */
  llmProviderEnv: string;
}

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly config: TypedConfigService,
    private readonly llm: LlmService,
  ) {}

  check(): HealthReport {
    return {
      status: 'ok',
      env: this.config.get('NODE_ENV'),
      version: process.env.npm_package_version ?? '0.0.0',
      uptime: (Date.now() - this.startedAt) / 1000,
      timestamp: new Date().toISOString(),
      llmProvider: this.llm.providerName,
      llmProviderEnv: this.config.get('LLM_PROVIDER'),
    };
  }
}
