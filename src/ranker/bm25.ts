// src/ranker/bm25.ts
import { InvertedIndex } from '../indexer/inverted-index.js';
import { config } from '../config/index.js';

/**
 * BM25 (Best Matching 25) - Industry Standard Ranking
 *
 * Improvements over TF-IDF:
 * 1. Term frequency saturation (diminishing returns for repeated terms)
 * 2. Document length normalization (long docs don't unfairly dominate)
 *
 * Formula:
 * score(D,Q) = Σ IDF(qi) × (f(qi,D) × (k1 + 1)) / (f(qi,D) + k1 × (1 - b + b × |D|/avgdl))
 *
 * Where:
 * - f(qi,D) = frequency of term qi in document D
 * - |D| = length of document D
 * - avgdl = average document length
 * - k1 = term frequency saturation parameter (typically 1.2)
 * - b = document length normalization (typically 0.75)
 */
export function bm25Score(
  termFreqInDoc: number,
  docLength: number,
  avgDocLength: number,
  totalDocs: number,
  docsContainingTerm: number,
  k1: number = config.bm25.k1,
  b: number = config.bm25.b
): number {
  if (docsContainingTerm === 0) return 0;

  // IDF component (with smoothing to avoid negative values)
  const idf = Math.log(
    (totalDocs - docsContainingTerm + 0.5) /
    (docsContainingTerm + 0.5) + 1
  );

  // TF component with saturation and length normalization
  const tfNorm =
    (termFreqInDoc * (k1 + 1)) /
    (termFreqInDoc + k1 * (1 - b + b * (docLength / avgDocLength)));

  return idf * tfNorm;
}

export function searchWithBM25(
  queryTerms: string[],
  index: InvertedIndex
): Map<string, number> {
  const scores = new Map<string, number>();
  const totalDocs = index.getTotalDocuments();
  const avgDocLength = index.getAverageDocLength();

  for (const term of queryTerms) {
    const postings = index.getPostings(term);
    const df = postings.length;

    for (const posting of postings) {
      const meta = index.getDocMeta(posting.docId);
      if (!meta) continue;

      const score = bm25Score(
        posting.termFrequency,
        meta.wordCount,
        avgDocLength,
        totalDocs,
        df
      );

      scores.set(
        posting.docId,
        (scores.get(posting.docId) || 0) + score
      );
    }
  }

  return scores;
}