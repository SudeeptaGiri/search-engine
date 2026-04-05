// src/storage/redis.ts
import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let client: Redis;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null, // required for BullMQ
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err) => logger.error({ err }, 'Redis error'));
  }
  return client;
}

// Crawl deduplication
export async function hasUrlBeenCrawled(url: string): Promise<boolean> {
  const redis = getRedis();
  return (await redis.sismember('crawled_urls', url)) === 1;
}

export async function markUrlCrawled(url: string): Promise<void> {
  const redis = getRedis();
  await redis.sadd('crawled_urls', url);
}

// Query caching
export async function getCachedResults(query: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(`search:${query}`);
}

export async function cacheResults(
  query: string,
  results: string,
  expiry: number = config.search.cacheExpiry
): Promise<void> {
  const redis = getRedis();
  await redis.setex(`search:${query}`, expiry, results);
}

// Domain rate limiting
export async function canCrawlDomain(domain: string): Promise<boolean> {
  const redis = getRedis();
  const key = `ratelimit:${domain}`;
  const lastCrawl = await redis.get(key);

  if (!lastCrawl) return true;

  const elapsed = Date.now() - parseInt(lastCrawl);
  return elapsed >= config.crawler.delayBetweenRequests;
}

export async function recordDomainCrawl(domain: string): Promise<void> {
  const redis = getRedis();
  await redis.set(
    `ratelimit:${domain}`,
    Date.now().toString(),
    'PX',
    config.crawler.delayBetweenRequests
  );
}