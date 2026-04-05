// src/crawler/reddit-source.ts
import { request } from 'undici';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface RedditPageData {
  url: string;
  title: string;
  textContent: string;
  links: string[];         // Links to more Reddit pages
  metadata: {
    subreddit: string;
    author: string;
    score: number;
    numComments: number;
    createdUtc: Date;
    permalink: string;
  };
}

/**
 * Fetch Reddit page using .json trick
 * Works exactly like fetching Wikipedia — just a URL fetch
 * No API keys needed
 */
export async function fetchRedditPage(url: string): Promise<RedditPageData[] | null> {
  try {
    // Convert any Reddit URL to JSON format
    const jsonUrl = toRedditJsonUrl(url);
    if (!jsonUrl) return null;

    const response = await request(jsonUrl, {
      method: 'GET',
      headers: {
        // Reddit requires a User-Agent or it blocks you
        'User-Agent': config.crawler.userAgent,
        'Accept': 'application/json',
      },
      headersTimeout: 10000,
      bodyTimeout: 10000,
    });

    if (response.statusCode === 429) {
      logger.warn('Reddit rate limited, waiting 2 seconds...');
      await new Promise(r => setTimeout(r, 2000));
      return fetchRedditPage(url); // retry once
    }

    if (response.statusCode !== 200) {
      await response.body.dump();
      return null;
    }

    const data = await response.body.json() as any;
    return parseRedditJson(data, url);
  } catch (error) {
    logger.warn({ url, error: (error as Error).message }, 'Reddit fetch failed');
    return null;
  }
}

/**
 * Convert any Reddit URL to its .json version
 * 
 * Input:  https://www.reddit.com/r/javascript/hot
 * Output: https://www.reddit.com/r/javascript/hot.json
 * 
 * Input:  https://old.reddit.com/r/javascript/comments/abc123/title
 * Output: https://www.reddit.com/r/javascript/comments/abc123/title.json
 */
function toRedditJsonUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Normalize to www.reddit.com
    parsed.hostname = 'www.reddit.com';

    // Remove trailing slash
    let path = parsed.pathname;
    if (path.endsWith('/')) path = path.slice(0, -1);

    // Add .json if not already there
    if (!path.endsWith('.json')) {
      path += '.json';
    }

    parsed.pathname = path;

    // Add limit parameter for listing pages
    if (!parsed.searchParams.has('limit')) {
      parsed.searchParams.set('limit', '100');
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Parse Reddit JSON into our standard format
 * Reddit returns different structures for different page types
 */
function parseRedditJson(data: any, originalUrl: string): RedditPageData[] {
  const results: RedditPageData[] = [];

  // ─── Case 1: Subreddit listing (r/javascript/hot) ───
  // Returns: { kind: "Listing", data: { children: [...] } }
  if (data?.kind === 'Listing' && data?.data?.children) {
    for (const child of data.data.children) {
      if (child.kind === 't3') { // t3 = post
        const post = parsePost(child.data);
        if (post) results.push(post);
      }
    }
    return results;
  }

  // ─── Case 2: Single post with comments ───
  // Returns: [PostListing, CommentsListing]
  if (Array.isArray(data) && data.length >= 1) {
    // Parse the post
    const postListing = data[0];
    if (postListing?.data?.children?.[0]?.kind === 't3') {
      const post = parsePost(postListing.data.children[0].data);
      if (post) results.push(post);
    }

    // Parse comments
    if (data.length >= 2) {
      const commentListing = data[1];
      if (commentListing?.data?.children) {
        for (const child of commentListing.data.children) {
          if (child.kind === 't1') { // t1 = comment
            const comment = parseComment(child.data, originalUrl);
            if (comment) results.push(comment);
          }
        }
      }
    }

    return results;
  }

  return results;
}

/**
 * Parse a single Reddit post into our format
 */
function parsePost(data: any): RedditPageData | null {
  if (!data || !data.title) return null;

  // Skip NSFW, deleted, removed
  if (data.over_18) return null;
  if (data.removed_by_category) return null;

  const title = data.title || '';
  const selfText = data.selftext || '';
  const flair = data.link_flair_text || '';
  const subreddit = data.subreddit || '';

  // Build searchable text — same as Wikipedia page text
  const textContent = [
    title,
    selfText,
    flair ? `[${flair}]` : '',
    `Posted in r/${subreddit} by u/${data.author || '[deleted]'}`,
  ].filter(Boolean).join('\n\n');

  // Skip very short posts
  if (textContent.length < 30) return null;

  const permalink = `https://www.reddit.com${data.permalink}`;

  // Discover more Reddit links to crawl
  const links: string[] = [];

  // Link to the comments page (to crawl comments too)
  links.push(permalink);

  // Link to the subreddit (to discover more posts)
  links.push(`https://www.reddit.com/r/${subreddit}/hot`);
  links.push(`https://www.reddit.com/r/${subreddit}/top?t=week`);

  // If the post links to another Reddit post
  if (data.url && data.url.includes('reddit.com')) {
    links.push(data.url);
  }

  return {
    url: permalink,
    title,
    textContent,
    links,
    metadata: {
      subreddit,
      author: data.author || '[deleted]',
      score: data.score || 0,
      numComments: data.num_comments || 0,
      createdUtc: new Date((data.created_utc || 0) * 1000),
      permalink,
    },
  };
}

/**
 * Parse a single Reddit comment into our format
 */
function parseComment(data: any, postUrl: string): RedditPageData | null {
  if (!data || !data.body) return null;
  if (data.body === '[deleted]' || data.body === '[removed]') return null;
  if (data.body.length < 30) return null;

  const subreddit = data.subreddit || '';

  return {
    url: postUrl + `#comment_${data.id}`,
    title: `Comment by u/${data.author || '[deleted]'} in r/${subreddit}`,
    textContent: data.body,
    links: [], // Comments don't generate new crawl links
    metadata: {
      subreddit,
      author: data.author || '[deleted]',
      score: data.score || 0,
      numComments: 0,
      createdUtc: new Date((data.created_utc || 0) * 1000),
      permalink: `https://www.reddit.com${data.permalink || ''}`,
    },
  };
}

/**
 * Check if a URL is a Reddit URL
 */
export function isRedditUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname.includes('reddit.com');
  } catch {
    return false;
  }
}

/**
 * Generate seed URLs for Reddit crawling
 * Same concept as Wikipedia seed URLs
 */
export function getRedditSeedUrls(subreddits: string[]): string[] {
  const seeds: string[] = [];

  for (const sub of subreddits) {
    seeds.push(`https://www.reddit.com/r/${sub}/hot`);
    seeds.push(`https://www.reddit.com/r/${sub}/top?t=week`);
    seeds.push(`https://www.reddit.com/r/${sub}/new`);
  }

  return seeds;
}