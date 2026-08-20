import { Logger } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseLangChainProvider } from './base-langchain.provider';

export interface GeminiProviderOptions {
  apiKey: string;
  model: string;
  defaultTimeoutMs: number;
}

/**
 * Gemini via LangChain `ChatGoogleGenerativeAI`. Structured JSON is handled
 * by {@link BaseLangChainProvider} so Groq and Gemini share one parse path.
 */
export class GeminiProvider extends BaseLangChainProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  protected readonly model: ChatGoogleGenerativeAI;
  protected readonly defaultTimeoutMs: number;

  constructor(opts: GeminiProviderOptions) {
    super();
    this.defaultTimeoutMs = opts.defaultTimeoutMs;
    this.model = new ChatGoogleGenerativeAI({
      apiKey: opts.apiKey,
      model: opts.model,
      temperature: 0.45,
      json: true,
      maxRetries: 0,
    });
    this.logger.debug(`LangChain ChatGoogleGenerativeAI model=${opts.model}`);
  }
}
