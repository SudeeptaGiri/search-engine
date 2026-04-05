// src/indexer/trie.ts

interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  frequency: number;    // how popular this term is
  word: string | null;  // the complete word at this node
}

function createNode(): TrieNode {
  return {
    children: new Map(),
    isEndOfWord: false,
    frequency: 0,
    word: null,
  };
}

export class Trie {
  private root: TrieNode = createNode();

  /**
   * Insert a word with its frequency (document frequency)
   */
  insert(word: string, frequency: number = 1): void {
    let current = this.root;

    for (const char of word) {
      if (!current.children.has(char)) {
        current.children.set(char, createNode());
      }
      current = current.children.get(char)!;
    }

    current.isEndOfWord = true;
    current.frequency += frequency;
    current.word = word;
  }

  /**
   * Search for a word
   */
  search(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isEndOfWord;
  }

  /**
   * Check if any word starts with prefix
   */
  startsWith(prefix: string): boolean {
    return this.findNode(prefix) !== null;
  }

  /**
   * Get autocomplete suggestions for a prefix
   * Returns top N suggestions sorted by frequency
   */
  autocomplete(prefix: string, limit: number = 10): string[] {
    const node = this.findNode(prefix);
    if (!node) return [];

    const suggestions: { word: string; frequency: number }[] = [];
    this.collectWords(node, suggestions);

    // Sort by frequency (most popular first)
    suggestions.sort((a, b) => b.frequency - a.frequency);

    return suggestions.slice(0, limit).map(s => s.word);
  }

  /**
   * Find the node for a given prefix
   */
  private findNode(prefix: string): TrieNode | null {
    let current = this.root;

    for (const char of prefix) {
      if (!current.children.has(char)) {
        return null;
      }
      current = current.children.get(char)!;
    }

    return current;
  }

  /**
   * DFS to collect all words under a node
   */
  private collectWords(
    node: TrieNode,
    results: { word: string; frequency: number }[]
  ): void {
    if (node.isEndOfWord && node.word) {
      results.push({ word: node.word, frequency: node.frequency });
    }

    for (const child of node.children.values()) {
      this.collectWords(child, results);
    }
  }

  /**
   * Build trie from inverted index terms
   */
  buildFromTerms(terms: Map<string, number>): void {
    for (const [term, docFrequency] of terms) {
      this.insert(term, docFrequency);
    }
  }

  getSize(): number {
    let count = 0;
    const traverse = (node: TrieNode) => {
      if (node.isEndOfWord) count++;
      for (const child of node.children.values()) {
        traverse(child);
      }
    };
    traverse(this.root);
    return count;
  }
}