import { Logger } from '@nestjs/common';
import { ChatGroq } from '@langchain/groq';
import { BaseLangChainProvider } from './base-langchain.provider';

export interface GroqProviderOptions {
  apiKey: string;
  model: string;
  defaultTimeoutMs: number;
}

/**
 * Groq via LangChain `ChatGroq`. Shares structured-output handling with Gemini.
 */
export class GroqLangChainProvider extends BaseLangChainProvider {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqLangChainProvider.name);
  protected readonly model: ChatGroq;
  protected readonly defaultTimeoutMs: number;

  constructor(opts: GroqProviderOptions) {
    super();
    this.defaultTimeoutMs = opts.defaultTimeoutMs;
    this.model = new ChatGroq({
      apiKey: opts.apiKey,
      model: opts.model,
      temperature: 0.2,
      maxRetries: 0,
    });
    this.logger.debug(`LangChain ChatGroq model=${opts.model}`);
  }
}
