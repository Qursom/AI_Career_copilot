import { Inject, Injectable, Logger } from '@nestjs/common';
import type { GenerateStructuredArgs, LlmProvider } from './llm.interface';
import { LLM_PROVIDER } from './llm.tokens';

/**
 * Public entry point for callers. Thin pass-through to the configured
 * provider — kept so feature modules don't depend on provider internals
 * and so we can layer retries/metrics here later.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(@Inject(LLM_PROVIDER) private readonly provider: LlmProvider) {
    this.logger.log(`LLM provider: ${provider.name}`);
  }

  get providerName(): string {
    return this.provider.name;
  }

  generateStructured<T>(args: GenerateStructuredArgs<T>): Promise<T> {
    return this.provider.generateStructured(args);
  }
}
