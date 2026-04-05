import type { SearchResult } from '../types/search';

interface ResultCardProps {
  result: SearchResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  return (
    <article className="result-card">
      <div className="result-card__top">
        <div className="result-card__url">{result.url}</div>
        <div className="result-card__score">Score {result.score.toFixed(3)}</div>
      </div>

      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="result-card__title"
      >
        {result.title}
      </a>

      <div
        className="result-card__snippet"
        dangerouslySetInnerHTML={{ __html: result.snippet }}
      />
    </article>
  );
}