export type MarketImportance = 'core' | 'important' | 'emerging';

export interface PublicSkillRecord {
  id: string;
  role: string;
  skill: string;
  importance: MarketImportance;
  evidence: string;
  sourceName: string;
  sourceUrl: string;
  seniority?: string;
}

export interface RagVectorMetadata {
  role: string;
  skill: string;
  importance: MarketImportance;
  evidence: string;
  sourceName: string;
  sourceUrl: string;
  seniority: string;
  /**
   * Embedding provider that produced this point's vector. Stored so retrieval
   * can detect a corpus that was ingested with different embeddings than the
   * ones being used to query it — a mismatch that otherwise looks like
   * plausible but meaningless results.
   */
  embeddingProvider: string;
}

export interface RagEvidence {
  skill: string;
  role: string;
  importance: MarketImportance;
  evidence: string;
  sourceName: string;
  sourceUrl: string;
  score: number;
  embeddingProvider: string;
}

export interface RagContext {
  promptContext: string;
  marketSignals: string[];
  priorityGaps: string[];
  citations: string[];
}
