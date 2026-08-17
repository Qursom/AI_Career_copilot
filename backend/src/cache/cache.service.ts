import { Inject, Injectable } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { CACHE_STORE, type CacheStore } from './cache.store';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_STORE) private readonly store: CacheStore,
    private readonly config: TypedConfigService,
  ) {}

  get(key: string): Promise<string | null> {
    return this.store.get(key);
  }

  set(key: string, value: string): Promise<void> {
    return this.store.set(
      key,
      value,
      this.config.get('REDIS_CACHE_TTL_SECONDS'),
    );
  }

  setWithTtl(key: string, value: string, ttlSeconds: number): Promise<void> {
    return this.store.set(key, value, ttlSeconds);
  }

  del(key: string): Promise<void> {
    return this.store.del(key);
  }
}
