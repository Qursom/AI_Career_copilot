import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { TypedConfigService } from '../config/typed-config.service';
import { JobStatusController } from './job-status.controller';
import { RESUME_ANALYSIS_QUEUE } from './queue.constants';
import { ResumeJobClient } from './resume-job.client';

/**
 * BullMQ broker for resume analysis. Imported only when REDIS_URL is set.
 * CacheStore remains the session/cache abstraction; this sits beside it.
 *
 * The worker class lives in this folder but is registered by ResumeModule so
 * we do not create a Nest import cycle (processor needs ResumeAnalysisService).
 */
@Module({
  imports: [
    AuthModule,
    BullModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => {
        const logger = new Logger('QueueModule');
        const url = config.get('REDIS_URL');
        logger.log(`BullMQ broker ${url}`);
        return {
          connection: {
            url,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            connectTimeout: 2_000,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: RESUME_ANALYSIS_QUEUE }),
  ],
  controllers: [JobStatusController],
  providers: [ResumeJobClient],
  exports: [ResumeJobClient, BullModule],
})
export class QueueModule {}
