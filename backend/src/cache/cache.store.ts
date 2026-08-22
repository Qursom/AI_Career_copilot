export const CACHE_STORE = Symbol('CACHE_STORE');

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  ping(): Promise<boolean>;
}

export class MemoryCacheStore implements CacheStore {
  private readonly map = new Map<string, { value: string; exp: number }>();

  get(key: string): Promise<string | null> {
    const row = this.map.get(key);
    if (!row) return Promise.resolve(null);
    if (row.exp < Date.now()) {
      this.map.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(row.value);
  }

  set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.map.set(key, { value, exp: Date.now() + ttlSeconds * 1000 });
    return Promise.resolve();
  }

  del(key: string): Promise<void> {
    this.map.delete(key);
    return Promise.resolve();
  }

  ping(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
