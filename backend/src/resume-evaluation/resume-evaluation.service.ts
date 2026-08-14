import { Injectable, Logger } from '@nestjs/common';
import { CandidateComparisonService } from './services/candidate-comparison.service';
import { ModelFactory } from './services/model.factory';
import { PineconeRetrievalService } from './services/pinecone-retrieval.service';
import { VerdictService } from './services/verdict.service';
import { buildResumeEvaluationGraph } from './graph/resume-evaluation.graph';
import type { EvaluateResumeDto } from './dto/evaluate-resume.dto';
import type { ResumeEvaluationResult } from './schemas';

@Injectable()
export class ResumeEvaluationService {
  private readonly logger = new Logger(ResumeEvaluationService.name);
  private readonly graph;
  constructor(models: ModelFactory, rag: PineconeRetrievalService, comparison: CandidateComparisonService, verdict: VerdictService) {
    this.graph = buildResumeEvaluationGraph({ models, rag, comparison, verdict });
  }
  async evaluate(dto: EvaluateResumeDto, requestId?: string): Promise<ResumeEvaluationResult> {
    const started = Date.now();
    try {
      const state = await this.graph.invoke({ resumeText: dto.resume, jobDescription: dto.jobDescription, coverLetter: dto.coverLetter, targetRole: dto.targetRole, requestId });
      this.logger.log(`requestId=${requestId ?? 'unknown'} graph=resumeEvaluation durationMs=${Date.now() - started}`);
      if (!state.finalResult) throw new Error('Resume evaluation graph completed without a final result.');
      return state.finalResult;
    } catch (err) {
      this.logger.error(`requestId=${requestId ?? 'unknown'} graph=resumeEvaluation failed durationMs=${Date.now() - started}: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
}
