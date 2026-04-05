// src/crawler/fetcher.ts
import { request } from 'undici';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface FetchResult {
  url: string;
  statusCode: number;
  html: string;
  contentType: string;
  redirectUrl?: string;
}

export async function fetchPage(url: string): Promise<FetchResult | null> {
  try {
    const response = await request(url, {
      method: 'GET',
      headers: {
        'User-Agent': config.crawler.userAgent,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // maxRedirections: 5,
      headersTimeout: config.crawler.requestTimeout,
      bodyTimeout: config.crawler.requestTimeout,
    });

    const contentType = (response.headers['content-type'] as string) || '';

    // Only process HTML
    if (!contentType.includes('text/html')) {
      await response.body.dump(); // consume body to free resources
      return null;
    }

    const html = await response.body.text();

    // Skip very small pages (likely error pages)
    if (html.length < 100) return null;

    // Skip very large pages (likely data dumps)
    if (html.length > 5_000_000) return null;

    return {
      url,
      statusCode: response.statusCode,
      html,
      contentType,
    };
  } catch (error) {
    logger.warn({ url, error: (error as Error).message }, 'Fetch failed');
    return null;
  }
}