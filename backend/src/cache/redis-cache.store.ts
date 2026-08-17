import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { CacheStore } from './cache.store';

@Injectable()
export class RedisCacheStore implements CacheStore, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheStore.name);
  private readonly client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
    void this.client.connect().catch((err: unknown) => {
      this.logger.warn(
        `Redis connect failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(
        `Redis set failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(
        `Redis del failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
