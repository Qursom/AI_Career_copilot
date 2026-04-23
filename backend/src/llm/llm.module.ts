import { Logger, Module, type Provider } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import type { LlmProvider } from './llm.interface';
import { LlmService } from './llm.service';
import { LLM_PROVIDER } from './llm.tokens';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenaiProvider } from './providers/openai.provider';
import { MockLlmProvider } from './providers/mock.provider';

const llmProviderFactory: Provider = {
  provide: LLM_PROVIDER,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService): LlmProvider => {
    const logger = new Logger('LlmModule');
    const kind = config.get('LLM_PROVIDER');

    if (kind === 'openai') {
      const apiKey = config.get('OPENAI_API_KEY');
      if (!apiKey) {
        logger.warn(
          'LLM_PROVIDER=openai but OPENAI_API_KEY is empty. Falling back to mock.',
        );
        return new MockLlmProvider();
      }
      return new OpenaiProvider({
        apiKey,
        model: config.get('OPENAI_MODEL'),
        defaultTimeoutMs: config.get('LLM_TIMEOUT_MS'),
        maxCompletionTokens: config.get('OPENAI_MAX_COMPLETION_TOKENS'),
      });
    }

    if (kind === 'gemini') {
      const apiKey = config.get('GEMINI_API_KEY');
      if (!apiKey) {
        logger.warn(
          'LLM_PROVIDER=gemini but GEMINI_API_KEY is empty. Falling back to mock.',
        );
        return new MockLlmProvider();
      }
      return new GeminiProvider({
        apiKey,
        model: config.get('GEMINI_MODEL'),
        defaultTimeoutMs: config.get('LLM_TIMEOUT_MS'),
      });
    }

    return new MockLlmProvider();
  },
};

@Module({
  providers: [llmProviderFactory, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
