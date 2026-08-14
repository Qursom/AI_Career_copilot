import { Injectable, Logger } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import type { RagContext } from './rag.types';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(private readonly config: TypedConfigService) {}

  buildResumeContext(args: {
    role?: string;
    resume: string;
  }): Promise<RagContext> {
    void args;
    return this.buildContext();
  }

  buildJobMatchContext(args: {
    role?: string;
    resume: string;
    jobDescription: string;
  }): Promise<RagContext> {
    void args;
    return this.buildContext();
  }

  /**
   * Retrieval is a no-op until a vector store is wired in.
   * RAG_ENABLED=false and "no store configured" both yield empty context.
   */
  private buildContext(): Promise<RagContext> {
    if (!this.config.get('RAG_ENABLED')) {
      return Promise.resolve(emptyContext());
    }

    this.logger.debug('RAG retrieval skipped: no vector store configured');
    return Promise.resolve(emptyContext());
  }
}

function emptyContext(): RagContext {
  return {
    promptContext: '',
    marketSignals: [],
    priorityGaps: [],
    citations: [],
  };
}
