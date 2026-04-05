import type { SearchResponse } from '../types/search';
import ResultCard from './ResultCard';
import Pagination from './Pagination';

interface ResultsListProps {
  results: SearchResponse;
  page: number;
  query: string;
  onPageChange: (nextPage: number) => void;
}

export default function ResultsList({ results, page, query, onPageChange }: ResultsListProps) {
  return (
    <section className="results">
      <div className="results__meta">
        About {results.totalResults} results ({results.timeTaken}ms)
        {results.cached ? ' • cached' : ''}
        {' • '}
        {results.algorithm.toUpperCase()}
      </div>

      <div className="results__list">
        {results.results.length === 0 ? (
          <div className="empty-state">No results found for "{query}"</div>
        ) : (
          results.results.map((result, i) => <ResultCard key={`${result.url}-${i}`} result={result} />)
        )}
      </div>

      <Pagination page={page} totalPages={results.totalPages} onPageChange={onPageChange} />
    </section>
  );
}