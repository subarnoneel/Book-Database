import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import BookCover from "./BookCover";

const COLUMNS = [
  { field: "name", label: "Title" },
  { field: "author", label: "Author" },
  { field: "publisher", label: "Publisher", className: "hidden md:table-cell" },
  { field: "genre", label: "Genre", className: "hidden sm:table-cell" },
];

function BookTable({ books, loading, sort, order, onSort, onDelete, linkState }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-paper-line bg-paper-dark/60 text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            {COLUMNS.map(({ field, label, className = "" }) => (
              <th
                key={field}
                className={`px-4 py-3 font-semibold ${className}`}
                aria-sort={sort === field ? (order === "asc" ? "ascending" : "descending") : undefined}
              >
                <button
                  type="button"
                  onClick={() => onSort(field)}
                  className="inline-flex items-center gap-1 uppercase hover:text-ink"
                >
                  {label}
                  {sort === field &&
                    (order === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                </button>
              </th>
            ))}
            <th className="px-4 py-3 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-line">
          {loading
            ? Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3" colSpan={COLUMNS.length + 1}>
                    <div className="skeleton h-10 w-full" />
                  </td>
                </tr>
              ))
            : books.map((book) => (
                <tr key={book._id} className="transition hover:bg-paper/70">
                  <td className="px-4 py-3">
                    <Link to={`/books/${book._id}`} state={linkState} className="flex items-center gap-3">
                      <BookCover title={book.name} size="sm" />
                      <span className="font-serif font-semibold text-ink hover:text-brand-700">{book.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{book.author}</td>
                  <td className="hidden px-4 py-3 text-ink-soft md:table-cell">
                    {book.publisher || <span className="text-ink-muted">—</span>}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                      {book.genre}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-right">
                    <Link
                      to={`/update/${book._id}`}
                      state={linkState}
                      className="icon-btn"
                      title="Edit"
                      aria-label={`Edit ${book.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(book)}
                      className="icon-btn hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                      aria-label={`Delete ${book.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

export default BookTable;
