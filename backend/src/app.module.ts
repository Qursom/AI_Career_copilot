import {
  MiddlewareConsumer,
  Module,
  NestModule,
  type Provider,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypedConfigModule } from './config/typed-config.module';
import { TypedConfigService } from './config/typed-config.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { DatabaseModule } from './database/database.module';
import { LlmModule } from './llm/llm.module';
import { ResumeModule } from './resume/resume.module';
import { JobMatchModule } from './job-match/job-match.module';
import { HealthModule } from './health/health.module';
import { RagModule } from './rag/rag.module';
import { UsersModule } from './users/users.module';

const globals: Provider[] = [
  { provide: APP_FILTER, useClass: AllExceptionsFilter },
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  { provide: APP_GUARD, useClass: ThrottlerGuard },
];

@Module({
  imports: [
    TypedConfigModule,
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL_MS'),
            limit: config.get('THROTTLE_LIMIT'),
          },
        ],
      }),
    }),
    AuthModule,
    CacheModule,
    UsersModule,
    LlmModule,
    ResumeModule,
    JobMatchModule,
    HealthModule,
    RagModule,
  ],
  providers: globals,
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*path}');
  }
}
