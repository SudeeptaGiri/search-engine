// src/indexer/inverted-index.ts
import { logger } from '../utils/logger.js';

/**
 * Posting: one entry in the inverted index
 * For each term, we store which documents contain it
 */
export interface Posting {
  docId: string;
  termFrequency: number;   // how many times term appears in doc
  positions: number[];      // where in the doc (for phrase queries)
}

/**
 * Document metadata stored alongside the index
 */
export interface DocMeta {
  docId: string;
  wordCount: number;        // needed for BM25 normalization
  url?: string;
  title?: string;
}

/**
 * In-Memory Inverted Index
 *
 * Structure:
 *   term → [Posting, Posting, ...]
 *
 * Example:
 *   "javascript" → [
 *     { docId: "abc", termFrequency: 5, positions: [0, 12, 45, 67, 89] },
 *     { docId: "def", termFrequency: 2, positions: [3, 78] },
 *   ]
 */
export class InvertedIndex {
  // The core index: term → postings list
  private index: Map<string, Posting[]> = new Map();

  // Document metadata
  private documents: Map<string, DocMeta> = new Map();

  // Cached stats
  private totalDocuments = 0;
  private totalWordCount = 0;

  /**
   * Add a document to the index
   */
  addDocument(
    docId: string,
    termFrequencies: Map<string, number>,
    positions: Map<string, number[]>,
    wordCount: number,
    meta?: { url?: string; title?: string }
  ): void {
    // Store document metadata
    this.documents.set(docId, {
      docId,
      wordCount,
      url: meta?.url,
      title: meta?.title,
    });

    // Add each term to the inverted index
    for (const [term, freq] of termFrequencies) {
      if (!this.index.has(term)) {
        this.index.set(term, []);
      }

      const postings = this.index.get(term)!;

      // Check if document already exists (update case)
      const existingIdx = postings.findIndex(p => p.docId === docId);
      const posting: Posting = {
        docId,
        termFrequency: freq,
        positions: positions.get(term) || [],
      };

      if (existingIdx >= 0) {
        postings[existingIdx] = posting;
      } else {
        postings.push(posting);
      }
    }

    this.totalDocuments = this.documents.size;
    this.totalWordCount += wordCount;
  }

  /**
   * Remove a document from the index
   */
  removeDocument(docId: string): void {
    const meta = this.documents.get(docId);
    if (!meta) return;

    // Remove from all posting lists
    for (const [term, postings] of this.index) {
      const filtered = postings.filter(p => p.docId !== docId);
      if (filtered.length === 0) {
        this.index.delete(term);
      } else {
        this.index.set(term, filtered);
      }
    }

    this.totalWordCount -= meta.wordCount;
    this.documents.delete(docId);
    this.totalDocuments = this.documents.size;
  }

  /**
   * Get postings for a term
   */
  getPostings(term: string): Posting[] {
    return this.index.get(term) || [];
  }

  /**
   * Get document frequency (how many docs contain this term)
   */
  getDocumentFrequency(term: string): number {
    return this.index.get(term)?.length || 0;
  }

  /**
   * Get document metadata
   */
  getDocMeta(docId: string): DocMeta | undefined {
    return this.documents.get(docId);
  }

  getTotalDocuments(): number {
    return this.totalDocuments;
  }

  getAverageDocLength(): number {
    if (this.totalDocuments === 0) return 0;
    return this.totalWordCount / this.totalDocuments;
  }

  /**
   * Get all unique terms (for autocomplete)
   */
  getAllTerms(): string[] {
    return Array.from(this.index.keys());
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      totalDocuments: this.totalDocuments,
      totalTerms: this.index.size,
      averageDocLength: this.getAverageDocLength(),
      totalWordCount: this.totalWordCount,
    };
  }

  /**
   * Serialize index for persistence
   */
  serialize(): string {
    const data = {
      index: Array.from(this.index.entries()),
      documents: Array.from(this.documents.entries()),
      totalWordCount: this.totalWordCount,
    };
    return JSON.stringify(data);
  }

  /**
   * Deserialize index from persistence
   */
  static deserialize(json: string): InvertedIndex {
    const data = JSON.parse(json);
    const idx = new InvertedIndex();
    idx.index = new Map(data.index);
    idx.documents = new Map(data.documents);
    idx.totalWordCount = data.totalWordCount;
    idx.totalDocuments = idx.documents.size;
    return idx;
  }
}