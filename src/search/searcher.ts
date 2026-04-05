// src/search/searcher.ts
import { InvertedIndex } from '../indexer/inverted-index.js';
import { Trie } from '../indexer/trie.js';
import { rankDocuments, RankedResult, RankingAlgorithm } from '../ranker/ranker.js';
import { processQuery } from '../processing/pipeline.js';
import { parseQuery, ParsedQuery } from './query-parser.js';
import { highlightSnippet } from './highlighter.js';
import { getWebPageById } from '../storage/mongodb.js';
import { getCachedResults, cacheResults } from '../storage/redis.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  page: number;
  totalPages: number;
  timeTaken: number; // milliseconds
  algorithm: RankingAlgorithm;
  cached: boolean;
}

export class SearchEngine {
  constructor(
    private index: InvertedIndex,
    private trie: Trie
  ) {}

  async search(
    query: string,
    page: number = 1,
    limit: number = config.search.resultsPerPage,
    algorithm: RankingAlgorithm = 'bm25'
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = `${query}:${page}:${limit}:${algorithm}`;
    const cached = await getCachedResults(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as SearchResponse;
      parsed.cached = true;
      parsed.timeTaken = Date.now() - startTime;
      return parsed;
    }

    // Parse query
    const parsedQuery = parseQuery(query);

    // Process query terms through same pipeline as documents
    const allTerms = [
      ...parsedQuery.terms,
      ...parsedQuery.mustInclude,
    ];
    const processedTerms = processQuery(allTerms.join(' '));
    const excludeTerms = new Set(processQuery(parsedQuery.mustExclude.join(' ')));

    if (processedTerms.length === 0) {
      return {
        query,
        results: [],
        totalResults: 0,
        page,
        totalPages: 0,
        timeTaken: Date.now() - startTime,
        algorithm,
        cached: false,
      };
    }

    // Rank documents
    const offset = (page - 1) * limit;
    // Get more results than needed for filtering
    const rankedDocs = rankDocuments(
      processedTerms,
      this.index,
      algorithm,
      config.search.maxResults,
      0
    );

    // Filter excluded terms
    let filteredDocs = rankedDocs;
    if (excludeTerms.size > 0) {
      filteredDocs = rankedDocs.filter(doc => {
        for (const term of excludeTerms) {
          const postings = this.index.getPostings(term);
          if (postings.some(p => p.docId === doc.docId)) {
            return false;
          }
        }
        return true;
      });
    }

    const totalResults = filteredDocs.length;
    const paginatedDocs = filteredDocs.slice(offset, offset + limit);

    // Fetch full document data and build results
    const results: SearchResult[] = [];
    for (const ranked of paginatedDocs) {
      const doc = await getWebPageById(ranked.docId);
      if (!doc) continue;

      results.push({
        url: doc.url,
        title: doc.title || doc.url,
        snippet: highlightSnippet(doc.textContent, allTerms),
        score: Math.round(ranked.score * 10000) / 10000,
      });
    }

    const response: SearchResponse = {
      query,
      results,
      totalResults,
      page,
      totalPages: Math.ceil(totalResults / limit),
      timeTaken: Date.now() - startTime,
      algorithm,
      cached: false,
    };

    // Cache results
    await cacheResults(cacheKey, JSON.stringify(response));

    logger.info({
      query,
      results: totalResults,
      time: response.timeTaken,
    }, 'Search completed');

    return response;
  }

  autocomplete(prefix: string, limit: number = 10): string[] {
    if (prefix.length < 2) return [];
    return this.trie.autocomplete(prefix.toLowerCase(), limit);
  }

  getStats() {
    return {
      index: this.index.getStats(),
      trie: { terms: this.trie.getSize() },
    };
  }
}