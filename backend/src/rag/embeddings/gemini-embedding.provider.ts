import { Logger } from '@nestjs/common';
import { Embeddings } from '@langchain/core/embeddings';
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
 * LangChain `Embeddings` adapter for Gemini.
 *
 * `@langchain/google-genai`'s `GoogleGenerativeAIEmbeddings` does not pass
 * `outputDimensionality`, which this corpus depends on (Matryoshka 768/1536
 * vs the model's native 3072). The REST field is forwarded here so ingest
 * and query stay in the same vector space.
 */
export class GeminiEmbeddingProvider
  extends Embeddings
  implements EmbeddingProvider
{
  readonly name = 'gemini-embeddings';
  readonly dimensions: number;
  private readonly logger = new Logger(GeminiEmbeddingProvider.name);
  private readonly endpoint: string;

  constructor(private readonly opts: GeminiEmbeddingProviderOptions) {
    super({});
    this.dimensions = opts.outputDimensionality;
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      opts.model,
    )}:embedContent`;
  }

  embedText(text: string): Promise<number[]> {
    return this.embedQuery(text);
  }

  async embedQuery(text: string): Promise<number[]> {
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
    if (values.length !== this.dimensions) {
      throw new Error(
        `Gemini embedding width ${values.length} does not match GEMINI_EMBEDDING_DIMENSIONS=${this.dimensions}.`,
      );
    }
    return values;
  }

  embedDocuments(documents: string[]): Promise<number[][]> {
    return Promise.all(documents.map((doc) => this.embedQuery(doc)));
  }
}
