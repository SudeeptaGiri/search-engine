// src/search/query-parser.ts

export interface ParsedQuery {
  terms: string[];          // regular search terms
  mustInclude: string[];    // +term (must have)
  mustExclude: string[];    // -term (must not have)
  phrases: string[];        // "exact phrase"
  raw: string;
}

/**
 * Parse search queries with operators
 *
 * Examples:
 *   "javascript tutorial"        → terms: [javascript, tutorial]
 *   "javascript -java"           → terms: [javascript], exclude: [java]
 *   "+react tutorial"            → mustInclude: [react], terms: [tutorial]
 *   '"web development" guide'    → phrases: [web development], terms: [guide]
 */
export function parseQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    terms: [],
    mustInclude: [],
    mustExclude: [],
    phrases: [],
    raw: query.trim(),
  };

  // Extract quoted phrases
  const phraseRegex = /"([^"]+)"/g;
  let match;
  let remaining = query;

  while ((match = phraseRegex.exec(query)) !== null) {
    result.phrases.push(match[1].toLowerCase());
    remaining = remaining.replace(match[0], '');
  }

  // Process remaining tokens
  const tokens = remaining.trim().split(/\s+/).filter(t => t.length > 0);

  for (const token of tokens) {
    if (token.startsWith('+') && token.length > 1) {
      result.mustInclude.push(token.slice(1).toLowerCase());
    } else if (token.startsWith('-') && token.length > 1) {
      result.mustExclude.push(token.slice(1).toLowerCase());
    } else {
      result.terms.push(token.toLowerCase());
    }
  }

  return result;
}