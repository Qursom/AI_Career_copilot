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
}

export interface RagEvidence {
  skill: string;
  role: string;
  importance: MarketImportance;
  evidence: string;
  sourceName: string;
  sourceUrl: string;
  score: number;
}

export interface RagContext {
  promptContext: string;
  marketSignals: string[];
  priorityGaps: string[];
  citations: string[];
}
