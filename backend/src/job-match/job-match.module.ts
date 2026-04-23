import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';
import { JobMatchController } from './job-match.controller';
import { JobMatchService } from './job-match.service';

@Module({
  imports: [LlmModule, RagModule],
  controllers: [JobMatchController],
  providers: [JobMatchService],
})
export class JobMatchModule {}
