import { Logger } from '@nestjs/common';
import { ChatGroq } from '@langchain/groq';
import {
  BaseLangChainProvider,
  type StructuredOutputMethod,
} from './base-langchain.provider';

export interface GroqProviderOptions {
  apiKey: string;
  model: string;
  defaultTimeoutMs: number;
}

/**
 * Groq via LangChain `ChatGroq`. `jsonMode` is more portable than strict
 * json_schema on Groq's current models; BaseLangChainProvider still falls
 * back to invoke + JSON parse if the bind or API rejects it.
 */
export class GroqLangChainProvider extends BaseLangChainProvider {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqLangChainProvider.name);
  protected readonly model: ChatGroq;
  protected readonly defaultTimeoutMs: number;
  protected readonly structuredOutputMethod: StructuredOutputMethod = 'jsonMode';

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
