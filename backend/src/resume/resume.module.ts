import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';

@Module({
  imports: [LlmModule, RagModule],
  controllers: [ResumeController],
  providers: [ResumeService],
})
export class ResumeModule {}
