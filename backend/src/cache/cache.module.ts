import { Logger, Module, type Provider } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import { CacheService } from './cache.service';
import { CACHE_STORE, MemoryCacheStore } from './cache.store';
import { RedisCacheStore } from './redis-cache.store';

const cacheStoreProvider: Provider = {
  provide: CACHE_STORE,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService) => {
    const logger = new Logger('CacheModule');
    const url = config.get('REDIS_URL')?.trim();
    if (!url) {
      logger.warn('REDIS_URL unset; using in-memory cache');
      return new MemoryCacheStore();
    }
    logger.log('Using Redis cache');
    return new RedisCacheStore(url);
  },
};

@Module({
  providers: [cacheStoreProvider, CacheService],
  exports: [CacheService],
})
export class CacheModule {}
