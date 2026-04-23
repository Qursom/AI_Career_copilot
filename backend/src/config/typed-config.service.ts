import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Thin, strongly-typed wrapper around `ConfigService` so consumers don't pass
 * string keys and get `any` back. Prefer injecting this over `ConfigService`.
 */
@Injectable()
export class TypedConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get isProd(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get isTest(): boolean {
    return this.get('NODE_ENV') === 'test';
  }

  get corsOrigins(): string[] {
    return this.get('CORS_ORIGIN')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
