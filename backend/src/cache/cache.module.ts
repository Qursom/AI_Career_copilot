import { Logger, Module, type Provider } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { hasUpstashRest } from '../config/redis-url';
import { CacheService } from './cache.service';
import { CACHE_STORE, MemoryCacheStore } from './cache.store';
import { RedisCacheStore } from './redis-cache.store';
import { UpstashCacheStore } from './upstash-cache.store';

const cacheStoreProvider: Provider = {
  provide: CACHE_STORE,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService) => {
    const logger = new Logger('CacheModule');
    const restUrl = config.get('UPSTASH_REDIS_REST_URL');
    const restToken = config.get('UPSTASH_REDIS_REST_TOKEN');
    if (restUrl && restToken && hasUpstashRest({
      UPSTASH_REDIS_REST_URL: restUrl,
      UPSTASH_REDIS_REST_TOKEN: restToken,
    })) {
      logger.log('Using Upstash Redis REST cache');
      return new UpstashCacheStore(restUrl, restToken);
    }
    const url = config.get('REDIS_URL')?.trim();
    if (!url) {
      logger.warn('Upstash REST and REDIS_URL unset; using in-memory cache');
      return new MemoryCacheStore();
    }
    logger.log('Using Redis protocol cache');
    return new RedisCacheStore(url);
  },
};

@Module({
  providers: [cacheStoreProvider, CacheService],
  exports: [CacheService],
})
export class CacheModule {}
