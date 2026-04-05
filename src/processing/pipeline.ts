// src/processing/pipeline.ts
import { tokenize, tokenizeWithPositions } from './tokenizer.js';

export interface ProcessedDocument {
  tokens: string[];
  tokenPositions: Map<string, number[]>; // token → [positions]
  wordCount: number;
  termFrequencies: Map<string, number>;  // token → count
}

export function processDocument(text: string): ProcessedDocument {
  const tokensWithPos = tokenizeWithPositions(text);
  const tokens = tokensWithPos.map(t => t.token);

  // Build position map
  const tokenPositions = new Map<string, number[]>();
  for (const { token, position } of tokensWithPos) {
    if (!tokenPositions.has(token)) {
      tokenPositions.set(token, []);
    }
    tokenPositions.get(token)!.push(position);
  }

  // Build term frequency map
  const termFrequencies = new Map<string, number>();
  for (const token of tokens) {
    termFrequencies.set(token, (termFrequencies.get(token) || 0) + 1);
  }

  return {
    tokens,
    tokenPositions,
    wordCount: tokens.length,
    termFrequencies,
  };
}

export function processQuery(query: string): string[] {
  return tokenize(query);
}