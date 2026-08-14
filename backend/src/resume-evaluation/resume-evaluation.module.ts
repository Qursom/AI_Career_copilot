import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { TypedConfigModule } from '../config/typed-config.module';
import { ResumeEvaluationController } from './resume-evaluation.controller';
import { ResumeEvaluationService } from './resume-evaluation.service';
import { CandidateComparisonService } from './services/candidate-comparison.service';
import { ModelFactory } from './services/model.factory';
import { PineconeRetrievalService } from './services/pinecone-retrieval.service';
import { VerdictService } from './services/verdict.service';

@Module({ imports: [LlmModule, TypedConfigModule], controllers: [ResumeEvaluationController], providers: [ResumeEvaluationService, CandidateComparisonService, ModelFactory, PineconeRetrievalService, VerdictService] })
export class ResumeEvaluationModule {}
