// src/ranker/tf-idf.ts
import { InvertedIndex, Posting } from '../indexer/inverted-index.js';

/**
 * TF-IDF Scoring
 *
 * TF (Term Frequency) = occurrences of term in doc / total terms in doc
 * IDF (Inverse Document Frequency) = log(total docs / docs containing term)
 * Score = TF × IDF
 *
 * Intuition:
 * - Words that appear often in a doc are important TO THAT DOC
 * - Words that appear in few docs are important OVERALL
 * - Combining both gives relevance
 */
export function tfidfScore(
  termFreqInDoc: number,
  docWordCount: number,
  totalDocs: number,
  docsContainingTerm: number
): number {
  if (docsContainingTerm === 0 || docWordCount === 0) return 0;

  const tf = termFreqInDoc / docWordCount;
  const idf = Math.log((totalDocs + 1) / (docsContainingTerm + 1)) + 1;

  return tf * idf;
}

export function searchWithTfIdf(
  queryTerms: string[],
  index: InvertedIndex
): Map<string, number> {
  const scores = new Map<string, number>();
  const totalDocs = index.getTotalDocuments();

  for (const term of queryTerms) {
    const postings = index.getPostings(term);
    const df = postings.length;

    for (const posting of postings) {
      const meta = index.getDocMeta(posting.docId);
      if (!meta) continue;

      const score = tfidfScore(
        posting.termFrequency,
        meta.wordCount,
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