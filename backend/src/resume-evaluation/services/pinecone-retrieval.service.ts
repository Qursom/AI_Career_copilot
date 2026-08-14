import { Injectable, Logger } from '@nestjs/common';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone as PineconeClient } from '@pinecone-database/pinecone';
import { ModelFactory } from './model.factory';
import { TypedConfigService } from '../../config/typed-config.service';

export interface RetrievedDocument { content: string; score: number; metadata: Record<string, string>; }

@Injectable()
export class PineconeRetrievalService {
  private readonly logger = new Logger(PineconeRetrievalService.name);
  constructor(private readonly models: ModelFactory, private readonly config: TypedConfigService) {}

  async retrieve(query: string): Promise<RetrievedDocument[]> {
    if (!this.config.get('RAG_ENABLED') || !this.config.get('PINECONE_API_KEY') || !this.config.get('PINECONE_INDEX')) return [];
    try {
      const client = new PineconeClient({ apiKey: this.config.get('PINECONE_API_KEY') });
      const index = client.Index(this.config.get('PINECONE_INDEX'));
      const store = await PineconeStore.fromExistingIndex(this.models.getEmbeddings(), { pineconeIndex: index });
      const rows = await store.similaritySearchWithScore(query, this.config.get('RAG_TOP_K'));
      const seen = new Set<string>();
      return rows.filter(([doc, score]) => score >= this.config.get('RAG_SCORE_THRESHOLD') && doc.pageContent && !seen.has(doc.pageContent)).map(([doc, score]) => {
        seen.add(doc.pageContent);
        const m = Object.fromEntries(Object.entries(doc.metadata ?? {}).map(([k,v]) => [k, String(v)]));
        return { content: doc.pageContent.slice(0, this.config.get('RAG_MAX_CHARS_PER_DOC')), score, metadata: m };
      });
    } catch (err) {
      this.logger.warn(`RAG retrieval failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }
}
