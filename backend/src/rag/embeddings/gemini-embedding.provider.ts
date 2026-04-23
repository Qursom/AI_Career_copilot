import { Logger } from '@nestjs/common';
import type { EmbeddingProvider } from './embedding.interface';

export interface GeminiEmbeddingProviderOptions {
  apiKey: string;
  model: string;
  outputDimensionality: number;
}

interface EmbedContentResponse {
  embedding?: { values?: number[] };
  error?: { message?: string };
}

/**
 * Calls the Gemini REST embedding endpoint directly. We bypass the
 * `@google/generative-ai` SDK because its `EmbedContentRequest` type does
 * not expose `outputDimensionality`, which is required to get Matryoshka-
 * reduced vectors (e.g. 768-dim) out of `gemini-embedding-001` /
 * `gemini-embedding-2-preview`. The SDK itself is also deprecated in favor
 * of `@google/genai`, so we'll revisit when we migrate the chat provider.
 */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'gemini-embeddings';
  private readonly logger = new Logger(GeminiEmbeddingProvider.name);
  private readonly endpoint: string;

  constructor(private readonly opts: GeminiEmbeddingProviderOptions) {
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      opts.model,
    )}:embedContent`;
  }

  async embedText(text: string): Promise<number[]> {
    const cleaned = text.trim();
    if (!cleaned) return [];

    this.logger.debug(
      `Embedding ${cleaned.length} chars with ${this.opts.model} ` +
        `(dim=${this.opts.outputDimensionality})`,
    );

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.opts.apiKey,
      },
      body: JSON.stringify({
        model: `models/${this.opts.model}`,
        content: { parts: [{ text: cleaned }] },
        outputDimensionality: this.opts.outputDimensionality,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gemini embedding request failed (${response.status}): ${body}`,
      );
    }

    const payload = (await response.json()) as EmbedContentResponse;
    const values = payload.embedding?.values;
    if (!values?.length) {
      throw new Error('Gemini embedding response contained no vector values.');
    }
    return values;
  }
}
