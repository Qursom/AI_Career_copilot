import { Logger, Module, type Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { TypedConfigService } from '../config/typed-config.service';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';
import { UsersModule } from '../users/users.module';
import { MemoryResumeStore } from './memory-resume.store';
import { MongoResumeStore } from './mongo-resume.store';
import { PdfExtractService } from './pdf-extract.service';
import { ResumeEntity, ResumeEntitySchema } from './resume-document.schema';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { RESUME_STORE } from './resume.store';

const resumeStoreProvider: Provider = {
  provide: RESUME_STORE,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService) => {
    const logger = new Logger('ResumeModule');
    if (!config.get('MONGODB_URI')) {
      logger.warn('Using in-memory resume store');
      return new MemoryResumeStore();
    }
    return undefined;
  },
};

const mongoOn = Boolean(process.env.MONGODB_URI?.trim());

@Module({
  imports: [
    LlmModule,
    RagModule,
    AuthModule,
    UsersModule,
    CacheModule,
    ...(mongoOn
      ? [
          MongooseModule.forFeature([
            { name: ResumeEntity.name, schema: ResumeEntitySchema },
          ]),
        ]
      : []),
  ],
  controllers: [ResumeController],
  providers: [
    ResumeService,
    PdfExtractService,
    ...(mongoOn
      ? [
          MongoResumeStore,
          { provide: RESUME_STORE, useExisting: MongoResumeStore },
        ]
      : [resumeStoreProvider]),
  ],
})
export class ResumeModule {}
