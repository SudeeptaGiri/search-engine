export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  page: number;
  totalPages: number;
  timeTaken: number;
  algorithm: string;
  cached: boolean;
}