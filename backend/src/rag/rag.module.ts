import { Logger, Module, type Provider } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { EmbeddingService } from './embeddings/embedding.service';
import { GeminiEmbeddingProvider } from './embeddings/gemini-embedding.provider';
import { OpenaiEmbeddingProvider } from './embeddings/openai-embedding.provider';
import type { EmbeddingProvider } from './embeddings/embedding.interface';
import { NoopEmbeddingProvider } from './embeddings/noop-embedding.provider';
import { RagIngestionService } from './ingestion/rag-ingestion.service';
import { RagService } from './rag.service';
import { RAG_EMBEDDING_PROVIDER } from './rag.tokens';
import { PineconeVectorStore } from './vector/pinecone-vector.store';

const embeddingProviderFactory: Provider = {
  provide: RAG_EMBEDDING_PROVIDER,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService): EmbeddingProvider => {
    const logger = new Logger('RagModule');
    if (!config.get('RAG_ENABLED')) {
      logger.log('RAG disabled via RAG_ENABLED=false');
      return new NoopEmbeddingProvider();
    }

    if (config.get('RAG_EMBEDDING_PROVIDER') === 'openai') {
      const key = config.get('OPENAI_API_KEY');
      if (!key) {
        logger.warn(
          'RAG openai embeddings selected but OPENAI_API_KEY is empty. Retrieval will run without embeddings.',
        );
        return new NoopEmbeddingProvider();
      }
      return new OpenaiEmbeddingProvider({
        apiKey: key,
        model: config.get('OPENAI_EMBEDDING_MODEL'),
        dimensions: config.get('OPENAI_EMBEDDING_DIMENSIONS'),
      });
    }

    const apiKey = config.get('GEMINI_API_KEY');
    if (!apiKey) {
      logger.warn(
        'RAG enabled but GEMINI_API_KEY is empty. Retrieval will run without embeddings.',
      );
      return new NoopEmbeddingProvider();
    }

    return new GeminiEmbeddingProvider({
      apiKey,
      model: config.get('GEMINI_EMBEDDING_MODEL'),
      outputDimensionality: config.get('GEMINI_EMBEDDING_DIMENSIONS'),
    });
  },
};

@Module({
  providers: [
    embeddingProviderFactory,
    EmbeddingService,
    PineconeVectorStore,
    RagService,
    RagIngestionService,
  ],
  exports: [RagService, RagIngestionService],
})
export class RagModule {}
