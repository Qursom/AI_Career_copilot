import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { CacheService } from '../cache/cache.service';
import { isMongoConfigured } from '../config/mongo-enabled';
import { hasUpstashRest } from '../config/redis-url';
import { TypedConfigService } from '../config/typed-config.service';
import { LlmService } from '../llm/llm.service';

export type DepStatus = 'ok' | 'down' | 'skipped';

export interface HealthReport {
  status: 'ok';
  env: string;
  version: string;
  uptime: number;
  timestamp: string;
  /** Which provider implementation is active (`gemini`, `groq`, or `mock`). */
  llmProvider: string;
  /** Value of `LLM_PROVIDER` in env; if it differs from `llmProvider`, a key was missing and mock was used. */
  llmProviderEnv: string;
  /** `RAG_ENABLED` flag. Retrieval is empty until a vector store is wired. */
  ragEnabled: boolean;
}

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    mongo: DepStatus;
    redis: DepStatus;
  };
}

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly config: TypedConfigService,
    private readonly llm: LlmService,
    private readonly cache: CacheService,
    private readonly moduleRef: ModuleRef,
  ) {}

  check(): HealthReport {
    return {
      status: 'ok',
      env: this.config.get('NODE_ENV'),
      version: process.env.npm_package_version ?? '0.0.0',
      uptime: (Date.now() - this.startedAt) / 1000,
      timestamp: new Date().toISOString(),
      llmProvider: this.llm.providerName,
      llmProviderEnv: this.config.get('LLM_PROVIDER'),
      ragEnabled: this.config.get('RAG_ENABLED'),
    };
  }

  async ready(): Promise<ReadinessReport> {
    const mongo = await this.mongoStatus();
    const redis = await this.redisStatus();
    const degraded = mongo === 'down' || redis === 'down';
    return {
      status: degraded ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      checks: { mongo, redis },
    };
  }

  private async mongoStatus(): Promise<DepStatus> {
    if (!isMongoConfigured(this.config.get('MONGODB_URI'))) {
      return 'skipped';
    }
    try {
      const conn = this.moduleRef.get<Connection>(getConnectionToken(), {
        strict: false,
      });
      if (!conn || conn.readyState !== 1) return 'down';
      await conn.db?.admin().ping();
      return 'ok';
    } catch {
      return 'down';
    }
  }

  private async redisStatus(): Promise<DepStatus> {
    const rest = hasUpstashRest({
      UPSTASH_REDIS_REST_URL: this.config.get('UPSTASH_REDIS_REST_URL'),
      UPSTASH_REDIS_REST_TOKEN: this.config.get('UPSTASH_REDIS_REST_TOKEN'),
    });
    if (!this.config.get('REDIS_URL') && !rest) return 'skipped';
    return (await this.cache.ping()) ? 'ok' : 'down';
  }
}
