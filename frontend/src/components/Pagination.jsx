import { ChevronLeft, ChevronRight } from "lucide-react";

// Page numbers with gaps, e.g. 1 … 4 5 6 … 12
const pageItems = (page, totalPages) => {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(`gap-${p}`);
    items.push(p);
  });
  return items;
};

function Pagination({ page, totalPages, onChange, disabled }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        className="icon-btn disabled:opacity-40"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      {pageItems(page, totalPages).map((item) =>
        typeof item === "string" ? (
          <span key={item} className="px-1 text-ink-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onChange(item)}
            disabled={disabled}
            aria-current={item === page ? "page" : undefined}
            className={`h-10 min-w-10 rounded-lg px-3 text-sm font-semibold transition ${
              item === page ? "bg-brand-700 text-white" : "text-ink-soft hover:bg-paper-dark"
            }`}
          >
            {item}
          </button>
        )
      )}
      <button
        className="icon-btn disabled:opacity-40"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  );
}

export default Pagination;
