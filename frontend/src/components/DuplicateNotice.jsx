import { AlertTriangle, ExternalLink, Info, Layers } from "lucide-react";
import BookCover from "./BookCover";

const WARNING_KINDS = new Set(["duplicate", "likely", "series-unknown", "other-script"]);

const HEADINGS = {
  duplicate: "This book is already in your library",
  likely: "This may be a book you already have",
  check: "Possibly the same book: please check",
};

function MatchRow({ match }) {
  const { book, reason } = match;
  return (
    <li className="flex items-center gap-3 py-2">
      <BookCover title={book.name} size="sm" />
      <div className="min-w-0 flex-1">
        <a
          href={`/books/${book._id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1 font-semibold text-ink hover:text-brand-700 hover:underline"
        >
          <span className="truncate">{book.name}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        </a>
        <p className="truncate text-sm text-ink-soft">
          {book.author}
          {book.publisher ? ` · ${book.publisher}` : ""}
        </p>
        <p className="text-xs text-ink-muted">{reason}</p>
      </div>
    </li>
  );
}

// Shown under the Title field while adding or editing a book.
function DuplicateNotice({ matches }) {
  const warnings = matches.filter((m) => WARNING_KINDS.has(m.kind));
  const sameTitle = matches.filter((m) => m.kind === "same-title");
  const series = matches.filter((m) => m.kind === "series");
  if (!matches.length) return null;

  const heading = warnings.some((m) => m.kind === "duplicate")
    ? HEADINGS.duplicate
    : warnings.some((m) => m.kind === "likely")
      ? HEADINGS.likely
      : HEADINGS.check;

  return (
    <div className="mt-2.5 space-y-2" aria-live="polite">
      {warnings.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {heading}
          </p>
          <ul className="mt-1 divide-y divide-amber-200">
            {warnings.map((m) => (
              <MatchRow key={m.book._id} match={m} />
            ))}
          </ul>
          <p className="mt-1 text-xs text-amber-800">
            Open a book to compare. If it's a different book or a second copy, you can still add it.
          </p>
        </div>
      )}
      {sameTitle.length > 0 && (
        <div className="rounded-lg bg-paper-dark/60 px-4 py-2.5 text-sm text-ink-soft">
          <p className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" aria-hidden /> A book with this title by a different author is in the library:
          </p>
          <ul>
            {sameTitle.map((m) => (
              <MatchRow key={m.book._id} match={m} />
            ))}
          </ul>
        </div>
      )}
      {series.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
          <Layers className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            You also have other volumes of this series:{" "}
            {series.map((m, i) => (
              <span key={m.book._id}>
                {i > 0 && ", "}
                <a href={`/books/${m.book._id}`} target="_blank" rel="noreferrer" className="font-medium underline">
                  {m.book.name}
                </a>
              </span>
            ))}
          </span>
        </p>
      )}
    </div>
  );
}

export default DuplicateNotice;
