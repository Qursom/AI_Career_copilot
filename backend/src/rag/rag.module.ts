import { Logger, Module, type Provider } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { GeminiEmbeddingProvider } from './embeddings/gemini-embedding.provider';
import { EmbeddingService } from './embeddings/embedding.service';
import type { EmbeddingProvider } from './embeddings/embedding.interface';
import { MockEmbeddingProvider } from './embeddings/mock-embedding.provider';
import { NoopEmbeddingProvider } from './embeddings/noop-embedding.provider';
import { RagIngestionService } from './ingestion/rag-ingestion.service';
import { RagService } from './rag.service';
import { RAG_EMBEDDING_PROVIDER, RAG_VECTOR_STORE } from './rag.tokens';
import { NoopVectorStore } from './vector/noop-vector.store';
import { QdrantVectorStore } from './vector/qdrant-vector.store';
import type { VectorStore } from './vector/vector-store.interface';

const embeddingProviderFactory: Provider = {
  provide: RAG_EMBEDDING_PROVIDER,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService): EmbeddingProvider => {
    const logger = new Logger('RagModule');
    if (!config.get('RAG_ENABLED')) {
      logger.log('RAG disabled via RAG_ENABLED=false');
      return new NoopEmbeddingProvider();
    }
    const kind = config.get('RAG_EMBEDDING_PROVIDER');
    const dim = config.get('GEMINI_EMBEDDING_DIMENSIONS');
    if (kind === 'mock') {
      logger.log('Using mock embeddings');
      return new MockEmbeddingProvider(dim);
    }
    const apiKey = config.get('GEMINI_API_KEY');
    if (!apiKey) {
      // Falling back to mock here would silently query a Gemini-embedded
      // corpus with unrelated vectors, which reads as "no results".
      throw new Error(
        'RAG_EMBEDDING_PROVIDER=gemini requires GEMINI_API_KEY. Set the key, or set RAG_EMBEDDING_PROVIDER=mock and re-run "npm run rag:ingest".',
      );
    }
    logger.log('Using Gemini embeddings');
    return new GeminiEmbeddingProvider({
      apiKey,
      model: config.get('GEMINI_EMBEDDING_MODEL'),
      outputDimensionality: dim,
    });
  },
};

const vectorStoreFactory: Provider = {
  provide: RAG_VECTOR_STORE,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService): VectorStore => {
    const logger = new Logger('RagModule');
    const url = config.get('QDRANT_URL')?.trim();
    if (!config.get('RAG_ENABLED') || !url) {
      logger.log('No Qdrant URL; RAG retrieval returns empty context.');
      return new NoopVectorStore();
    }
    const apiKey = config.get('QDRANT_API_KEY');
    logger.log(
      apiKey
        ? `Using Qdrant at ${url} (API key configured)`
        : `Using Qdrant at ${url} (no API key — local/unauthenticated)`,
    );
    return new QdrantVectorStore(url, config.get('QDRANT_COLLECTION'), apiKey);
  },
};

@Module({
  providers: [
    embeddingProviderFactory,
    vectorStoreFactory,
    EmbeddingService,
    RagService,
    RagIngestionService,
  ],
  exports: [RagService, RagIngestionService],
})
export class RagModule {}
