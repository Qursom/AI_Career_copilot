import { Injectable, Logger } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { EmbeddingService } from './embeddings/embedding.service';
import { PineconeVectorStore } from './vector/pinecone-vector.store';
import type { RagContext, RagEvidence } from './rag.types';

interface BuildContextArgs {
  role?: string;
  resume: string;
  jobDescription?: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly config: TypedConfigService,
    private readonly embeddings: EmbeddingService,
    private readonly vectors: PineconeVectorStore,
  ) {}

  async buildResumeContext(args: {
    role?: string;
    resume: string;
  }): Promise<RagContext> {
    return this.buildContext({ role: args.role, resume: args.resume });
  }

  async buildJobMatchContext(args: {
    role?: string;
    resume: string;
    jobDescription: string;
  }): Promise<RagContext> {
    return this.buildContext({
      role: args.role,
      resume: args.resume,
      jobDescription: args.jobDescription,
    });
  }

  private async buildContext(args: BuildContextArgs): Promise<RagContext> {
    if (!this.config.get('RAG_ENABLED')) return emptyContext();

    const query = this.buildQuery(args);
    try {
      const vector = await this.embeddings.embedText(query);
      const matches = await this.vectors.query(
        vector,
        this.config.get('PINECONE_TOP_K'),
      );
      const threshold = this.config.get('PINECONE_MIN_SCORE');

      const evidence = matches
        .filter((m) => m.score >= threshold)
        .map((m) => ({
          ...m.metadata,
          score: m.score,
        }))
        .slice(0, 8);

      return this.toContext(evidence, args.resume);
    } catch (err) {
      this.logger.warn(
        `RAG retrieval skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
      return emptyContext();
    }
  }

  private buildQuery(args: BuildContextArgs): string {
    return [
      `TARGET ROLE: ${args.role ?? 'Unknown role'}`,
      args.jobDescription ? `JOB DESCRIPTION:\n${args.jobDescription}` : '',
      `RESUME:\n${args.resume}`,
      'TASK: retrieve real-world role expectations and market-priority skills.',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private toContext(evidence: RagEvidence[], resumeText: string): RagContext {
    if (evidence.length === 0) return emptyContext();

    const resumeHaystack = normalize(resumeText);
    const seenCitations = new Set<string>();
    const missingSkills: string[] = [];
    const marketSignals: string[] = [];
    const citations: string[] = [];

    for (const item of evidence) {
      marketSignals.push(
        `${item.skill} (${item.importance}) — ${item.evidence}`,
      );

      const citation = `${item.sourceName} (${item.sourceUrl})`;
      if (!seenCitations.has(citation)) {
        seenCitations.add(citation);
        citations.push(citation);
      }

      if (!resumeHaystack.includes(normalize(item.skill))) {
        const gap = `${item.skill} is market-priority for ${item.role}`;
        if (!missingSkills.includes(gap)) missingSkills.push(gap);
      }
    }

    const promptLines = evidence.map(
      (item, idx) =>
        `${idx + 1}. Skill: ${item.skill}; Role: ${item.role}; Importance: ${item.importance}; Evidence: ${item.evidence}; Source: ${item.sourceName}`,
    );

    return {
      promptContext: [
        'RAG EVIDENCE (public labor-market datasets):',
        ...promptLines,
      ].join('\n'),
      marketSignals: marketSignals.slice(0, 6),
      priorityGaps: missingSkills.slice(0, 6),
      citations: citations.slice(0, 4),
    };
  }
}

function normalize(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

function emptyContext(): RagContext {
  return {
    promptContext: '',
    marketSignals: [],
    priorityGaps: [],
    citations: [],
  };
}
