import { mkdirSync } from 'fs';
import { randomUUID } from 'node:crypto';
import { join } from 'path';
import { Logger, Module, type Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { isMongoConfigured } from '../config/mongo-enabled';
import { TypedConfigService } from '../config/typed-config.service';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';
import { UsersModule } from '../users/users.module';
import { MemoryResumeStore } from './memory-resume.store';
import { MongoResumeStore } from './mongo-resume.store';
import { PdfExtractService } from './pdf-extract.service';
import { ResumeAnalysisService } from './resume-analysis.service';
import { ResumeEntity, ResumeEntitySchema } from './resume-document.schema';
import { ResumeController } from './resume.controller';
import { ResumeFileService } from './resume-file.service';
import { ResumeService } from './resume.service';
import { RESUME_STORE } from './resume.store';

const resumeStoreProvider: Provider = {
  provide: RESUME_STORE,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService) => {
    const logger = new Logger('ResumeModule');
    if (!isMongoConfigured(config.get('MONGODB_URI'))) {
      logger.warn('Using in-memory resume store');
      return new MemoryResumeStore();
    }
    return undefined;
  },
};

const mongoOn = isMongoConfigured();

const uploadsDir = join(process.cwd(), 'uploads');
mkdirSync(uploadsDir, { recursive: true });

@Module({
  imports: [
    LlmModule,
    RagModule,
    AuthModule,
    UsersModule,
    CacheModule,
    // Upload rules for every resume endpoint. The size limit comes from config
    // here so multer rejects an oversized file at the boundary rather than
    // writing it to disk for ResumeFileService to reject afterwards.
    MulterModule.registerAsync({
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => ({
        storage: diskStorage({
          destination: uploadsDir,
          filename: (_req, _file, cb) => {
            cb(null, `temporary-resume-${randomUUID()}.pdf`);
          },
        }),
        limits: {
          fileSize: config.get('RESUME_MAX_FILE_SIZE_MB') * 1024 * 1024,
        },
        fileFilter: (_req, file, cb) => {
          const ok =
            file.mimetype === 'application/pdf' ||
            file.originalname.toLowerCase().endsWith('.pdf');
          cb(ok ? null : new Error('Only PDF files are accepted'), ok);
        },
      }),
    }),
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
    ResumeAnalysisService,
    ResumeFileService,
    PdfExtractService,
    ...(mongoOn
      ? [
          MongoResumeStore,
          { provide: RESUME_STORE, useExisting: MongoResumeStore },
        ]
      : [resumeStoreProvider]),
  ],
  exports: [ResumeService, ResumeAnalysisService],
})
export class ResumeModule {}
