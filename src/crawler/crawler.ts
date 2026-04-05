// src/crawler/crawler.ts — UPDATED
import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  getRedis,
  hasUrlBeenCrawled,
  markUrlCrawled,
  canCrawlDomain,
  recordDomainCrawl,
} from '../storage/redis.js';
import { saveWebPage } from '../storage/mongodb.js';
import { fetchPage } from './fetcher.js';
import { parsePage } from './parser.js';
import { fetchRedditPage, isRedditUrl, getRedditSeedUrls } from './reddit-source.js';
import { processDocument } from '../processing/pipeline.js';
import { URLNormalizer } from '../utils/url.js';
import { contentHash } from '../utils/hash.js';
import { fetchRobotsTxt, isPathAllowed } from './robots.js';

interface CrawlJob {
  url: string;
  depth: number;
  source: 'web' | 'reddit';   // ← NEW: track the source
}

export class Crawler {
  private queue: Queue<CrawlJob>;
  private worker: Worker<CrawlJob> | null = null;
  private crawledCount = 0;
  private contentHashes = new Set<string>();

  public onPageCrawled?: (
    docId: string,
    tokens: string[],
    termFreqs: Map<string, number>,
    wordCount: number,
    meta?: { url?: string; title?: string; source?: string; score?: number }
  ) => void;

  constructor() {
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };
    this.queue = new Queue<CrawlJob>('crawl-queue', { connection });
  }

  async start(): Promise<void> {
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };

    this.worker = new Worker<CrawlJob>(
      'crawl-queue',
      async (job: Job<CrawlJob>) => {
        await this.processJob(job.data);
      },
      {
        connection,
        concurrency: config.crawler.maxConcurrency,
        limiter: { max: 10, duration: 1000 },
      }
    );

    this.worker.on('completed', (job) => {
      logger.debug({ url: job.data.url, source: job.data.source }, 'Job done');
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ url: job?.data.url, error: err.message }, 'Job failed');
    });

    logger.info('Crawler worker started');
  }

  /**
   * Add seed URLs — works for BOTH Wikipedia and Reddit
   */
  async addSeedUrls(urls: string[]): Promise<void> {
    for (const url of urls) {
      const normalized = URLNormalizer.normalize(url);
      if (!normalized) continue;

      const source = isRedditUrl(normalized) ? 'reddit' : 'web';

      await this.queue.add('crawl', {
        url: normalized,
        depth: 0,
        source,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      });
    }
    logger.info({ count: urls.length }, 'Seed URLs added');
  }

  /**
   * Add Reddit subreddits as seed URLs
   */
  async addRedditSubreddits(subreddits: string[]): Promise<void> {
    const seeds = getRedditSeedUrls(subreddits);
    await this.addSeedUrls(seeds);
    logger.info({
      subreddits,
      seedUrls: seeds.length,
    }, '🔴 Reddit subreddits added to crawl queue');
  }

  /**
   * Process a single crawl job
   * Routes to the correct handler based on source
   */
  private async processJob(job: CrawlJob): Promise<void> {
    const { url, depth, source } = job;

    if (this.crawledCount >= config.crawler.maxPages) return;
    if (depth > config.crawler.maxDepth) return;
    if (await hasUrlBeenCrawled(url)) return;

    const domain = URLNormalizer.getDomain(url);

    // Rate limiting per domain
    if (!(await canCrawlDomain(domain))) {
      await this.queue.add('crawl', job, {
        delay: config.crawler.delayBetweenRequests,
        attempts: 3,
      });
      return;
    }

    await markUrlCrawled(url);
    await recordDomainCrawl(domain);

    // ─── Route to correct handler ───
    if (source === 'reddit' || isRedditUrl(url)) {
      await this.processRedditUrl(url, depth);
    } else {
      await this.processWebUrl(url, depth);
    }
  }

  /**
   * Process a Reddit URL
   * Fetches JSON, parses posts/comments, indexes them
   */
  private async processRedditUrl(url: string, depth: number): Promise<void> {
    const pages = await fetchRedditPage(url);
    if (!pages || pages.length === 0) return;

    for (const page of pages) {
      // Content deduplication
      const hash = contentHash(page.textContent);
      if (this.contentHashes.has(hash)) continue;
      this.contentHashes.add(hash);

      // Process through same NLP pipeline as Wikipedia
      const processed = processDocument(page.textContent);
      if (processed.wordCount < 5) continue;

      // Save to same MongoDB collection as Wikipedia pages
      const savedDoc = await saveWebPage({
        url: page.url,
        domain: 'reddit.com',
        title: page.title,
        rawHtml: '',                    // No HTML for Reddit JSON
        textContent: page.textContent,
        tokens: processed.tokens,
        wordCount: processed.wordCount,
        contentHash: hash,
        links: page.links,
        depth,
        statusCode: 200,
      });

      this.crawledCount++;

      logger.info({
        source: '🔴 Reddit',
        subreddit: page.metadata.subreddit,
        title: page.title.substring(0, 60),
        score: page.metadata.score,
        words: processed.wordCount,
        total: this.crawledCount,
      }, 'Page indexed');

      // Notify indexer — same callback as Wikipedia
      if (this.onPageCrawled) {
        this.onPageCrawled(
          savedDoc._id.toString(),
          processed.tokens,
          processed.termFrequencies,
          processed.wordCount,
          {
            url: page.url,
            title: page.title,
            source: 'reddit',
            score: page.metadata.score,
          }
        );
      }

      // Add discovered Reddit links to crawl queue
      for (const link of page.links.slice(0, 20)) {
        if (!(await hasUrlBeenCrawled(link)) && isRedditUrl(link)) {
          await this.queue.add('crawl', {
            url: link,
            depth: depth + 1,
            source: 'reddit',
          }, {
            attempts: 2,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
          });
        }
      }
    }
  }

  /**
   * Process a regular web URL (Wikipedia, etc.)
   * This is your EXISTING logic — unchanged
   */
  private async processWebUrl(url: string, depth: number): Promise<void> {
    const domain = URLNormalizer.getDomain(url);

    // Check robots.txt
    const robotsRules = await fetchRobotsTxt(domain);
    const urlPath = new URL(url).pathname;
    if (!isPathAllowed(urlPath, robotsRules)) return;

    // Fetch HTML
    const fetchResult = await fetchPage(url);
    if (!fetchResult) return;

    // Parse HTML
    const parsed = parsePage(fetchResult.html, url);

    // Content deduplication
    const hash = contentHash(parsed.textContent);
    if (this.contentHashes.has(hash)) return;
    this.contentHashes.add(hash);

    // Process text
    const processed = processDocument(parsed.textContent);
    if (processed.wordCount < 10) return;

    // Save to MongoDB
    const savedDoc = await saveWebPage({
      url,
      domain,
      title: parsed.title,
      rawHtml: fetchResult.html,
      textContent: parsed.textContent,
      tokens: processed.tokens,
      wordCount: processed.wordCount,
      contentHash: hash,
      links: parsed.links,
      depth,
      statusCode: fetchResult.statusCode,
    });

    this.crawledCount++;

    logger.info({
      source: '🌐 Web',
      title: parsed.title.substring(0, 60),
      words: processed.wordCount,
      links: parsed.links.length,
      total: this.crawledCount,
    }, 'Page indexed');

    // Notify indexer
    if (this.onPageCrawled) {
      this.onPageCrawled(
        savedDoc._id.toString(),
        processed.tokens,
        processed.termFrequencies,
        processed.wordCount,
        { url, title: parsed.title, source: 'web' }
      );
    }

    // Add discovered links
    for (const link of parsed.links.slice(0, 50)) {
      if (!(await hasUrlBeenCrawled(link))) {
        const linkSource = isRedditUrl(link) ? 'reddit' : 'web';
        await this.queue.add('crawl', {
          url: link,
          depth: depth + 1,
          source: linkSource,
        }, {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
        });
      }
    }
  }

  async stop(): Promise<void> {
    if (this.worker) await this.worker.close();
    await this.queue.close();
    logger.info({ totalCrawled: this.crawledCount }, 'Crawler stopped');
  }

  getStats() {
    return {
      crawledCount: this.crawledCount,
      uniqueContent: this.contentHashes.size,
    };
  }
}