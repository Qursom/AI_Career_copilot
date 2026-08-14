import { Logger, Module, type Provider } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { EmbeddingService } from './embeddings/embedding.service';
import type { EmbeddingProvider } from './embeddings/embedding.interface';
import { NoopEmbeddingProvider } from './embeddings/noop-embedding.provider';
import { RagIngestionService } from './ingestion/rag-ingestion.service';
import { RagService } from './rag.service';
import { RAG_EMBEDDING_PROVIDER } from './rag.tokens';

const embeddingProviderFactory: Provider = {
  provide: RAG_EMBEDDING_PROVIDER,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService): EmbeddingProvider => {
    const logger = new Logger('RagModule');
    if (!config.get('RAG_ENABLED')) {
      logger.log('RAG disabled via RAG_ENABLED=false');
      return new NoopEmbeddingProvider();
    }

    logger.log(
      'No vector store configured; RAG retrieval returns empty context.',
    );
    return new NoopEmbeddingProvider();
  },
};

@Module({
  providers: [
    embeddingProviderFactory,
    EmbeddingService,
    RagService,
    RagIngestionService,
  ],
  exports: [RagService, RagIngestionService],
})
export class RagModule {}
