// src/search/highlighter.ts

export interface HighlightedSnippet {
  text: string;
  highlights: { start: number; end: number }[];
}

/**
 * Create a snippet with highlighted search terms
 */
export function highlightSnippet(
  text: string,
  queryTerms: string[],
  snippetLength: number = 200
): string {
  const lowerText = text.toLowerCase();

  // Find the best position to start the snippet
  // (where the most query terms appear close together)
  let bestPosition = 0;
  let bestScore = 0;

  for (let i = 0; i < lowerText.length - snippetLength; i += 50) {
    const window = lowerText.substring(i, i + snippetLength);
    let score = 0;
    for (const term of queryTerms) {
      if (window.includes(term)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPosition = i;
    }
  }

  // Extract snippet
  let snippet = text.substring(bestPosition, bestPosition + snippetLength);

  // Adjust to word boundaries
  if (bestPosition > 0) {
    const firstSpace = snippet.indexOf(' ');
    if (firstSpace > 0) {
      snippet = '...' + snippet.substring(firstSpace + 1);
    }
  }

  const lastSpace = snippet.lastIndexOf(' ');
  if (bestPosition + snippetLength < text.length && lastSpace > 0) {
    snippet = snippet.substring(0, lastSpace) + '...';
  }

  // Wrap matched terms with <mark> tags
  for (const term of queryTerms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    snippet = snippet.replace(regex, '<mark>$1</mark>');
  }

  return snippet;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}