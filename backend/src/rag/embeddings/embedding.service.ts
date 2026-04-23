import { Inject, Injectable } from '@nestjs/common';
import type { EmbeddingProvider } from './embedding.interface';
import { RAG_EMBEDDING_PROVIDER } from '../rag.tokens.js';

@Injectable()
export class EmbeddingService {
  constructor(
    @Inject(RAG_EMBEDDING_PROVIDER)
    private readonly provider: EmbeddingProvider,
  ) {}

  get providerName(): string {
    return this.provider.name;
  }

  embedText(text: string): Promise<number[]> {
    return this.provider.embedText(text);
  }
}
