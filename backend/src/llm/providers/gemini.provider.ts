import { Logger } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
  BaseLangChainProvider,
  type StructuredOutputMethod,
} from './base-langchain.provider';

export interface GeminiProviderOptions {
  apiKey: string;
  model: string;
  defaultTimeoutMs: number;
}

/**
 * Gemini via LangChain `ChatGoogleGenerativeAI`. Native jsonSchema structured
 * output is the default; `json: true` still applies if we fall back to invoke.
 */
export class GeminiProvider extends BaseLangChainProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  protected readonly model: ChatGoogleGenerativeAI;
  protected readonly defaultTimeoutMs: number;
  protected readonly structuredOutputMethod: StructuredOutputMethod =
    'jsonSchema';

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
