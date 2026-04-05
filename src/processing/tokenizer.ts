// src/processing/tokenizer.ts
import { STOP_WORDS } from './stopwords.js';
import { stem } from './stemmer.js';

export interface TokenizeOptions {
  removeStopWords?: boolean;
  applyStemming?: boolean;
  minLength?: number;
}

const DEFAULT_OPTIONS: TokenizeOptions = {
  removeStopWords: true,
  applyStemming: true,
  minLength: 2,
};

export function tokenize(
  text: string,
  options: TokenizeOptions = DEFAULT_OPTIONS
): string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let tokens = text
    .toLowerCase()
    // Remove special characters, keep alphanumeric and spaces
    .replace(/[^a-z0-9\s]/g, ' ')
    // Split on whitespace
    .split(/\s+/)
    // Remove empty strings
    .filter(token => token.length > 0);

  // Min length filter
  if (opts.minLength) {
    tokens = tokens.filter(t => t.length >= (opts.minLength||2));
  }

  // Remove stop words
  if (opts.removeStopWords) {
    tokens = tokens.filter(t => !STOP_WORDS.has(t));
  }

  // Apply stemming
  if (opts.applyStemming) {
    tokens = tokens.map(t => stem(t));
  }

  return tokens;
}

/**
 * Tokenize but also return position information
 * Needed for phrase queries and highlighting
 */
export function tokenizeWithPositions(
  text: string,
  options: TokenizeOptions = DEFAULT_OPTIONS
): { token: string; position: number; original: string }[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  const result: { token: string; position: number; original: string }[] = [];

  let position = 0;
  for (const word of words) {
    if (word.length === 0) continue;
    if (opts.minLength && word.length < opts.minLength) continue;
    if (opts.removeStopWords && STOP_WORDS.has(word)) continue;

    const token = opts.applyStemming ? stem(word) : word;
    result.push({ token, position, original: word });
    position++;
  }

  return result;
}