import { Logger, Module, type Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { isMongoConfigured } from '../config/mongo-enabled';
import { TypedConfigService } from '../config/typed-config.service';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';
import { UsersModule } from '../users/users.module';
import {
  JobMatchEntity,
  JobMatchEntitySchema,
} from './job-match-document.schema';
import { JobMatchController } from './job-match.controller';
import { JobMatchService } from './job-match.service';
import { JOB_MATCH_STORE } from './job-match.store';
import { MemoryJobMatchStore } from './memory-job-match.store';
import { MongoJobMatchStore } from './mongo-job-match.store';

const jobMatchStoreProvider: Provider = {
  provide: JOB_MATCH_STORE,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService) => {
    const logger = new Logger('JobMatchModule');
    if (!isMongoConfigured(config.get('MONGODB_URI'))) {
      logger.warn('Using in-memory job-match store');
      return new MemoryJobMatchStore();
    }
    return undefined;
  },
};

const mongoOn = isMongoConfigured();

@Module({
  imports: [
    LlmModule,
    RagModule,
    AuthModule,
    CacheModule,
    UsersModule,
    ...(mongoOn
      ? [
          MongooseModule.forFeature([
            { name: JobMatchEntity.name, schema: JobMatchEntitySchema },
          ]),
        ]
      : []),
  ],
  controllers: [JobMatchController],
  providers: [
    JobMatchService,
    ...(mongoOn
      ? [
          MongoJobMatchStore,
          { provide: JOB_MATCH_STORE, useExisting: MongoJobMatchStore },
        ]
      : [jobMatchStoreProvider]),
  ],
})
export class JobMatchModule {}
