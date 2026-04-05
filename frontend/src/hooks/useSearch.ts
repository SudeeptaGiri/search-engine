import { useCallback, useState } from 'react';
import type { SearchResponse } from '../types/search';

const API_BASE = 'http://localhost:3000';

export function useSearch() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const search = useCallback(async (searchQuery: string, searchPage: number = 1) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/search?q=${encodeURIComponent(searchQuery)}&page=${searchPage}&limit=10`
      );
      const data: SearchResponse = await res.json();
      setResults(data);
      setPage(searchPage);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    results,
    loading,
    page,
    search,
    setPage,
  };
}