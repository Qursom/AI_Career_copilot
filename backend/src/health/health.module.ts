import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [LlmModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
