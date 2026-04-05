// src/processing/stemmer.ts
import natural from 'natural';

const porterStemmer = natural.PorterStemmer;

export function stem(word: string): string {
  return porterStemmer.stem(word);
}

export function stemTokens(tokens: string[]): string[] {
  return tokens.map(token => stem(token));
}