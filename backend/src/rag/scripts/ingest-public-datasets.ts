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
    if (result.upserted === 0) {
      console.warn(
        '\n[RAG ingest] No vectors upserted. Set QDRANT_URL and run Docker Qdrant, then retry.\n',
      );
    }
  } finally {
    await app.close();
  }
}

void bootstrap();
