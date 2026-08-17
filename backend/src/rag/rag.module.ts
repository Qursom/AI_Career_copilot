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
    if (kind === 'gemini' && apiKey) {
      logger.log('Using Gemini embeddings');
      return new GeminiEmbeddingProvider({
        apiKey,
        model: config.get('GEMINI_EMBEDDING_MODEL'),
        outputDimensionality: dim,
      });
    }
    logger.log('Embedding provider unavailable; using mock embeddings');
    return new MockEmbeddingProvider(dim);
  },
};

const vectorStoreFactory: Provider = {
  provide: RAG_VECTOR_STORE,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService): VectorStore => {
    const logger = new Logger('RagModule');
    const url = config.get('QDRANT_URL');
    if (!config.get('RAG_ENABLED') || !url) {
      logger.log('No Qdrant URL; RAG retrieval returns empty context.');
      return new NoopVectorStore();
    }
    logger.log(`Using Qdrant at ${url}`);
    return new QdrantVectorStore(url, config.get('QDRANT_COLLECTION'));
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
