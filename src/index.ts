// src/index.ts — UPDATED
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectMongo } from './storage/mongodb.js';
import { getRedis } from './storage/redis.js';
import { InvertedIndex } from './indexer/inverted-index.js';
import { Trie } from './indexer/trie.js';
import { Crawler } from './crawler/crawler.js';
import { SearchEngine } from './search/searcher.js';
import { createServer } from './api/server.js';

async function main() {
  logger.info('🔍 Starting Search Engine (Wikipedia + Reddit)...');

  // ─── 1. Connect databases ───
  await connectMongo();
  getRedis();
  logger.info('✅ Databases connected');

  // ─── 2. Initialize index ───
  const invertedIndex = new InvertedIndex();
  const trie = new Trie();

  // ─── 3. Initialize crawler ───
  const crawler = new Crawler();

  crawler.onPageCrawled = (docId, tokens, termFreqs, wordCount, meta) => {
    const positions = new Map<string, number[]>();
    tokens.forEach((token, idx) => {
      if (!positions.has(token)) positions.set(token, []);
      positions.get(token)!.push(idx);
    });

    invertedIndex.addDocument(docId, termFreqs, positions, wordCount, {
      url: meta?.url,
      title: meta?.title,
    });

    for (const [term, freq] of termFreqs) {
      trie.insert(term, freq);
    }

    const stats = invertedIndex.getStats();
    if (stats.totalDocuments % 50 === 0) {
      logger.info({
        docs: stats.totalDocuments,
        terms: stats.totalTerms,
      }, '📊 Index stats');
    }
  };

  await crawler.start();
  logger.info('✅ Crawler started');

  // ─── 4. Initialize search ───
  const searchEngine = new SearchEngine(invertedIndex, trie);
  logger.info('✅ Search engine initialized');

  // ─── 5. Start API ───
  const server = await createServer(searchEngine, crawler);
  await server.listen({ port: config.api.port, host: config.api.host });
  logger.info(`✅ API running at http://localhost:${config.api.port}`);

  // ─── 6. Start crawling BOTH Wikipedia and Reddit ───
  await crawler.addSeedUrls([...config.crawler.seedUrls]);

  // Also add Reddit subreddits
  await crawler.addRedditSubreddits([...config.crawler.redditSubreddits]);

  logger.info('✅ Seed URLs queued');

  // ─── 7. Periodic Reddit refresh (every hour) ───
  setInterval(async () => {
  await crawler.addRedditSubreddits([...config.crawler.redditSubreddits]);
}, 60 * 60 * 1000);

  // ─── Shutdown ───
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    await crawler.stop();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info('');
  logger.info('🚀 Search Engine is ready!');
  logger.info('');
  logger.info('   Crawling: Wikipedia + Reddit (same crawler)');
  logger.info('');
  logger.info(`   Search:       http://localhost:${config.api.port}/search?q=javascript`);
  logger.info(`   Autocomplete: http://localhost:${config.api.port}/autocomplete?q=jav`);
  logger.info(`   Health:       http://localhost:${config.api.port}/health`);
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start');
  process.exit(1);
});