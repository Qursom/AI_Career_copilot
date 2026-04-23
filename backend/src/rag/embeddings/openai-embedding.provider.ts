import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { EmbeddingProvider } from './embedding.interface';

export interface OpenaiEmbeddingProviderOptions {
  apiKey: string;
  model: string;
  /** Must match the dimensionality of the Pinecone index (e.g. 3072 for text-embedding-3-large). */
  dimensions: number;
}

/**
 * OpenAI text-embedding-3-* vectors for Pinecone (same API key as chat LLM is fine).
 */
export class OpenaiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai-embeddings';
  private readonly logger = new Logger(OpenaiEmbeddingProvider.name);
  private readonly client: OpenAI;

  constructor(private readonly opts: OpenaiEmbeddingProviderOptions) {
    this.client = new OpenAI({ apiKey: opts.apiKey, maxRetries: 0 });
  }

  async embedText(text: string): Promise<number[]> {
    const cleaned = text.trim();
    if (!cleaned) return [];

    this.logger.debug(
      `Embedding ${cleaned.length} chars with ${this.opts.model} (dim=${this.opts.dimensions})`,
    );

    const res = await this.client.embeddings.create({
      model: this.opts.model,
      input: cleaned,
      dimensions: this.opts.dimensions,
    });

    const values = res.data[0]?.embedding;
    if (!values?.length) {
      throw new Error('OpenAI embedding response contained no vector values.');
    }
    return values;
  }
}
