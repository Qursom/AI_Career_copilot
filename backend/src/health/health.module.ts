import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { LlmModule } from '../llm/llm.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [LlmModule, CacheModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
