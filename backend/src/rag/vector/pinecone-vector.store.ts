import { Injectable, Logger } from '@nestjs/common';
import {
  Pinecone,
  type PineconeRecord,
  type RecordMetadata,
} from '@pinecone-database/pinecone';
import { TypedConfigService } from '../../config/typed-config.service';
import type { RagVectorMetadata } from '../rag.types';

export interface RagVectorMatch {
  id: string;
  score: number;
  metadata: RagVectorMetadata;
}

export interface UpsertRagVector {
  id: string;
  values: number[];
  metadata: RagVectorMetadata;
}

@Injectable()
export class PineconeVectorStore {
  private readonly logger = new Logger(PineconeVectorStore.name);

  constructor(private readonly config: TypedConfigService) {}

  private get indexName(): string {
    return this.config.get('PINECONE_INDEX');
  }

  private get namespace(): string {
    return this.config.get('PINECONE_NAMESPACE');
  }

  private get client(): Pinecone | null {
    const apiKey = this.config.get('PINECONE_API_KEY');
    if (!apiKey) return null;
    return new Pinecone({ apiKey });
  }

  /**
   * Resolves the data-plane index; pass PINECONE_HOST from the console when
   * using a serverless index (matches copilot-job-*.svc.*.pinecone.io).
   */
  private getDataIndex() {
    const client = this.client;
    if (!client) return null;
    const host = this.config.get('PINECONE_HOST');
    if (host) {
      return client.index(
        this.indexName,
        normalizePineconeDataHost(String(host)),
      );
    }
    return client.index(this.indexName);
  }

  async query(vector: number[], topK: number): Promise<RagVectorMatch[]> {
    const index = this.getDataIndex();
    if (!index || vector.length === 0) return [];
    const result = await index.namespace(this.namespace).query({
      vector,
      topK,
      includeMetadata: true,
    });

    const matches = result.matches ?? [];
    const normalized = matches
      .map((m) => {
        const metadata = toRagMetadata(m.metadata);
        if (!m.id || !metadata) return null;
        return {
          id: m.id,
          score: m.score ?? 0,
          metadata,
        };
      })
      .filter((m): m is RagVectorMatch => m !== null);
    return normalized;
  }

  async upsert(vectors: UpsertRagVector[]): Promise<number> {
    const index = this.getDataIndex();
    if (!index || vectors.length === 0) return 0;
    const records: PineconeRecord<RecordMetadata>[] = vectors.map((vector) => ({
      id: vector.id,
      values: vector.values,
      metadata: {
        role: vector.metadata.role,
        skill: vector.metadata.skill,
        importance: vector.metadata.importance,
        evidence: vector.metadata.evidence,
        sourceName: vector.metadata.sourceName,
        sourceUrl: vector.metadata.sourceUrl,
        seniority: vector.metadata.seniority,
      },
    }));
    await index.namespace(this.namespace).upsert({ records });
    this.logger.log(
      `Upserted ${vectors.length} vector(s) to ${this.indexName}/${this.namespace}`,
    );
    return vectors.length;
  }
}

/** Strips protocol/trailing slash so the Pinecone client gets a host string. */
export function normalizePineconeDataHost(host: string): string {
  let h = host.trim();
  h = h.replace(/\/$/, '');
  if (h.startsWith('https://')) h = h.slice(8);
  if (h.startsWith('http://')) h = h.slice(7);
  return h;
}

function toRagMetadata(metadata: unknown): RagVectorMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const candidate = metadata as Partial<RagVectorMetadata>;
  if (
    typeof candidate.role !== 'string' ||
    typeof candidate.skill !== 'string' ||
    typeof candidate.importance !== 'string' ||
    typeof candidate.evidence !== 'string' ||
    typeof candidate.sourceName !== 'string' ||
    typeof candidate.sourceUrl !== 'string'
  ) {
    return null;
  }
  return {
    role: candidate.role,
    skill: candidate.skill,
    importance: candidate.importance,
    evidence: candidate.evidence,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
    seniority:
      typeof candidate.seniority === 'string' ? candidate.seniority : '',
  };
}
