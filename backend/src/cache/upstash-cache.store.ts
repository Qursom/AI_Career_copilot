import { Injectable, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import type { CacheStore } from './cache.store';

@Injectable()
export class UpstashCacheStore implements CacheStore {
  private readonly logger = new Logger(UpstashCacheStore.name);
  private readonly client: Redis;

  constructor(url: string, token: string) {
    this.client = new Redis({ url, token });
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get<unknown>(key);
      if (value == null) return null;
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch (err) {
      this.logger.warn(
        `Upstash get failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      this.logger.warn(
        `Upstash set failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(
        `Upstash del failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async ping(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG' || pong === 'pong';
    } catch {
      return false;
    }
  }
}
