// src/api/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config/index.js';
import { SearchEngine } from '../search/searcher.js';
import { Crawler } from '../crawler/crawler.js';
import { RankingAlgorithm } from '../ranker/ranker.js';
import { logger } from '../utils/logger.js';

export async function createServer(
  searchEngine: SearchEngine,
  crawler: Crawler
) {
  const app = Fastify({
    logger: false, // we use our own logger
  });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ─── Health Check ───
  app.get('/health', async () => {
    return {
      status: 'ok',
      stats: searchEngine.getStats(),
      crawler: crawler.getStats(),
    };
  });

  // ─── Add Reddit subreddits to crawl ───
  app.post<{
    Body: { subreddits: string[] };
  }>('/crawl/reddit', {
    schema: {
      body: {
        type: 'object',
        required: ['subreddits'],
        properties: {
          subreddits: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 20,
          },
        },
      },
    },
  }, async (request) => {
    await crawler.addRedditSubreddits(request.body.subreddits);
    return {
      message: 'Reddit subreddits added to crawl queue',
      subreddits: request.body.subreddits,
    };
  });
  // ─── Search Endpoint ───
  app.get<{
    Querystring: {
      q: string;
      page?: string;
      limit?: string;
      algorithm?: RankingAlgorithm;
    };
  }>('/search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          page: { type: 'string' },
          limit: { type: 'string' },
          algorithm: { type: 'string', enum: ['tfidf', 'bm25'] },
        },
      },
    },
  }, async (request, reply) => {
    const { q, page = '1', limit = '10', algorithm = 'bm25' } = request.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const results = await searchEngine.search(q, pageNum, limitNum, algorithm);
    return results;
  });

  // ─── Autocomplete Endpoint ───
  app.get<{
    Querystring: { q: string; limit?: string };
  }>('/autocomplete', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          limit: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { q, limit = '10' } = request.query;
    const suggestions = searchEngine.autocomplete(q, parseInt(limit));
    return { suggestions };
  });

  // ─── Trigger Crawl ───
  app.post<{
    Body: { urls: string[] };
  }>('/crawl', {
    schema: {
      body: {
        type: 'object',
        required: ['urls'],
        properties: {
          urls: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
            maxItems: 10,
          },
        },
      },
    },
  }, async (request) => {
    await crawler.addSeedUrls(request.body.urls);
    return { message: 'URLs added to crawl queue', count: request.body.urls.length };
  });

  // ─── Crawl Status ───
  app.get('/crawl/status', async () => {
    return crawler.getStats();
  });

  return app;
}