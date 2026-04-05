// src/crawler/robots.ts
import { request } from 'undici';
import { logger } from '../utils/logger.js';
import { getRedis } from '../storage/redis.js';

interface RobotsRules {
  disallowed: string[];
  crawlDelay: number | null;
}

export async function fetchRobotsTxt(domain: string): Promise<RobotsRules> {
  const redis = getRedis();
  const cacheKey = `robots:${domain}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const rules: RobotsRules = { disallowed: [], crawlDelay: null };

  try {
    const response = await request(`https://${domain}/robots.txt`, {
      headersTimeout: 5000,
      bodyTimeout: 5000,
    });

    if (response.statusCode === 200) {
      const text = await response.body.text();
      const lines = text.split('\n');
      let isRelevantAgent = false;

      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();

        if (trimmed.startsWith('user-agent:')) {
          const agent = trimmed.split(':')[1].trim();
          isRelevantAgent = agent === '*' || agent === 'minisearchbot';
        }

        if (isRelevantAgent) {
          if (trimmed.startsWith('disallow:')) {
            const path = trimmed.split(':').slice(1).join(':').trim();
            if (path) rules.disallowed.push(path);
          }
          if (trimmed.startsWith('crawl-delay:')) {
            const delay = parseInt(trimmed.split(':')[1].trim());
            if (!isNaN(delay)) rules.crawlDelay = delay * 1000;
          }
        }
      }
    } else {
      await response.body.dump();
    }
  } catch (error) {
    logger.debug({ domain }, 'Could not fetch robots.txt');
  }

  // Cache for 24 hours
  await redis.setex(cacheKey, 86400, JSON.stringify(rules));
  return rules;
}

export function isPathAllowed(path: string, rules: RobotsRules): boolean {
  for (const disallowed of rules.disallowed) {
    if (path.startsWith(disallowed)) return false;
  }
  return true;
}