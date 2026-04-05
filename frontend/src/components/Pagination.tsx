interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1);

  return (
    <nav className="pagination" aria-label="Search results pages">
      {page > 1 && (
        <button className="btn btn--secondary" onClick={() => onPageChange(page - 1)}>
          ← Previous
        </button>
      )}

      {pages.map((p) => (
        <button
          key={p}
          className={`btn ${p === page ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}

      {page < totalPages && (
        <button className="btn btn--secondary" onClick={() => onPageChange(page + 1)}>
          Next →
        </button>
      )}
    </nav>
  );
}