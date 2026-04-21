import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { JobMatchController } from './job-match.controller';
import { JobMatchService } from './job-match.service';

@Module({
  imports: [LlmModule],
  controllers: [JobMatchController],
  providers: [JobMatchService],
})
export class JobMatchModule {}
