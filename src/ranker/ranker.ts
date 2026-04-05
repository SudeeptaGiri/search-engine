// src/ranker/ranker.ts
import { InvertedIndex } from '../indexer/inverted-index.js';
import { searchWithTfIdf } from './tf-idf.js';
import { searchWithBM25 } from './bm25.js';

export type RankingAlgorithm = 'tfidf' | 'bm25';

export interface RankedResult {
  docId: string;
  score: number;
}

export function rankDocuments(
  queryTerms: string[],
  index: InvertedIndex,
  algorithm: RankingAlgorithm = 'bm25',
  limit: number = 10,
  offset: number = 0
): RankedResult[] {
  let scores: Map<string, number>;

  switch (algorithm) {
    case 'tfidf':
      scores = searchWithTfIdf(queryTerms, index);
      break;
    case 'bm25':
      scores = searchWithBM25(queryTerms, index);
      break;
    default:
      scores = searchWithBM25(queryTerms, index);
  }

  // Sort by score descending
  const ranked = Array.from(scores.entries())
    .map(([docId, score]) => ({ docId, score }))
    .sort((a, b) => b.score - a.score);

  // Apply pagination
  return ranked.slice(offset, offset + limit);
}