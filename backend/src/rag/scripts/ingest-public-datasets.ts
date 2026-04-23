import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { RagIngestionService } from '../ingestion/rag-ingestion.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const ingestion = app.get(RagIngestionService);
    const result = await ingestion.ingestPublicDatasets();

    console.log(
      `RAG ingestion finished. processed=${result.processed}, upserted=${result.upserted}`,
    );
    if (result.upserted === 0 && result.processed > 0) {
      console.warn(
        '\n[RAG ingest] upserted=0 but records were processed: empty embeddings (check OPENAI_API_KEY) or missing PINECONE_API_KEY. See backend/.env.example.\n',
      );
    }
  } catch (err) {
    printIngestFailureHint(err);
    throw err;
  } finally {
    await app.close();
  }
}

function printIngestFailureHint(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('insufficient_quota')
  ) {
    console.error(
      '\n[RAG ingest] Embedding API returned quota/rate limit: no vectors were written to Pinecone.\n' +
        '  • OpenAI: add billing / credits at https://platform.openai.com/ then re-run.\n' +
        '  • Or set RAG_EMBEDDING_PROVIDER=gemini, GEMINI_API_KEY, and a Pinecone index with dimension = GEMINI_EMBEDDING_DIMENSIONS (e.g. 768).\n',
    );
  } else if (lower.includes('401') || lower.includes('invalid api key')) {
    console.error(
      '\n[RAG ingest] Invalid API key for the chosen embedding provider. Fix OPENAI_API_KEY or GEMINI_API_KEY in backend/.env.\n',
    );
  } else if (lower.includes('dimension') || lower.includes('vector')) {
    console.error(
      '\n[RAG ingest] Vector dimension mismatch: create a Pinecone index whose dimension matches OPENAI_EMBEDDING_DIMENSIONS or GEMINI_EMBEDDING_DIMENSIONS.\n',
    );
  }
}

void bootstrap();
