import Redis from "ioredis";

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(prefix?: string): Promise<void>;
}

class InMemoryCache implements Cache {
  private store = new Map<string, { value: unknown; expires?: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expires && item.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expires = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expires });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(prefix?: string): Promise<void> {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

class RedisCache implements Cache {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, { lazyConnect: true });
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const val = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, val, "EX", ttlSeconds);
    } else {
      await this.client.set(key, val);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clear(prefix?: string): Promise<void> {
    if (!prefix) {
      await this.client.flushdb();
      return;
    }
    const keys = await this.client.keys(`${prefix}*`);
    if (keys.length) await this.client.del(keys);
  }
}

export const cache: Cache = process.env.REDIS_URL
  ? new RedisCache(process.env.REDIS_URL)
  : new InMemoryCache();
