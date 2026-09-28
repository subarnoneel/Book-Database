import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookPlus, LayoutGrid, List, Plus, Search, SearchX, X } from "lucide-react";
import BookCard, { BookCardSkeleton } from "../components/BookCard";
import BookTable from "../components/BookTable";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import useDeleteBook from "../hooks/useDeleteBook";
import useLibraryMeta from "../hooks/useLibraryMeta";
import { fetchBooks, getErrorMessage } from "../services/api";
import { plural } from "../utils/format";

const PAGE_SIZE = 24;
const SEARCH_DELAY_MS = 300;
const VIEW_KEY = "library-view";

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Recently added" },
  { value: "createdAt:asc", label: "Oldest added" },
  { value: "name:asc", label: "Title A–Z" },
  { value: "name:desc", label: "Title Z–A" },
  { value: "author:asc", label: "Author A–Z" },
  { value: "author:desc", label: "Author Z–A" },
  { value: "publisher:asc", label: "Publisher A–Z" },
];

const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};

function Home() {
  // Search, filter, sort and page live in the URL so they survive going to a book and back.
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const genre = searchParams.get("genre") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number.parseInt(searchParams.get("page"), 10) || 1);
  // Passed to child pages so they can return to this exact list view.
  const linkState = { listSearch: searchParams.toString() ? `?${searchParams}` : "" };

  const [searchInput, setSearchInput] = useState(q);
  const [books, setBooks] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState(readView);
  const meta = useLibraryMeta(reloadKey);
  const { requestDelete, dialog } = useDeleteBook({ onDeleted: () => setReloadKey((k) => k + 1) });

  const updateParams = useCallback(
    (changes, { replace = false } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value === "" || value === undefined || value === null || (key === "page" && value === 1)) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          return next;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  // Keep the search box in sync when the URL changes (e.g. browser back button).
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Debounce typing, then search the whole library from page 1.
  useEffect(() => {
    if (searchInput.trim() === q) return;
    const timer = setTimeout(() => updateParams({ q: searchInput.trim(), page: 1 }, { replace: true }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput, q, updateParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchBooks({ q, genre, sort: sort || undefined, order: sort ? order : undefined, page, limit: PAGE_SIZE })
      .then(({ data }) => {
        if (cancelled) return;
        // e.g. the last book on the last page was deleted: step back a page.
        if (page > data.totalPages) {
          updateParams({ page: data.totalPages }, { replace: true });
          return;
        }
        setBooks(data.books);
        setTotalBooks(data.totalBooks);
        setTotalPages(data.totalPages);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "Could not load books"));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, genre, sort, order, page, reloadKey, updateParams]);

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Private mode etc.: the choice just won't be remembered.
    }
  };

  const handleSortSelect = (value) => {
    const [field, dir] = value.split(":");
    const isDefault = value === SORT_OPTIONS[0].value;
    updateParams({ sort: isDefault ? "" : field, order: isDefault ? "" : dir, page: 1 });
  };

  const handleColumnSort = (field) => {
    const nextOrder = sort === field && order === "asc" ? "desc" : "asc";
    updateParams({ sort: field, order: nextOrder, page: 1 });
  };

  const changePage = (next) => {
    updateParams({ page: next });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSearchInput("");
    updateParams({ q: "", genre: "", page: 1 });
  };

  const sortValue = sort ? `${sort}:${order}` : SORT_OPTIONS[0].value;
  const filtering = Boolean(q || genre);
  const firstShown = (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, totalBooks);

  let resultsLabel = "";
  if (!loading) {
    if (totalBooks === 0) resultsLabel = "";
    else if (filtering) resultsLabel = `${plural(totalBooks, "match", "matches")}${q ? ` for “${q}”` : ""}${genre ? ` in ${genre}` : ""}`;
    else resultsLabel = `Showing ${firstShown}–${lastShown} of ${totalBooks}`;
  }

  return (
    <>
      {/* Heading */}
      <section className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold text-brand-900 sm:text-4xl">Our Library</h1>
        <p className="mt-2 text-ink-soft">
          {meta.totalBooks > 0 ? (
            <>
              {plural(meta.totalBooks, "book")} · {plural(meta.authors.length, "author")} ·{" "}
              {plural(meta.genres.length, "genre")}
            </>
          ) : (
            <span className="invisible">…</span>
          )}
        </p>
      </section>

      {/* Search + controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title, author, genre…"
            aria-label="Search books"
            className="input h-12 pl-11 pr-10 [&::-webkit-search-cancel-button]:hidden"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-paper-dark hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={sortValue}
            onChange={(e) => handleSortSelect(e.target.value)}
            aria-label="Sort books"
            className="input h-12 flex-1 cursor-pointer sm:w-48 sm:flex-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {!SORT_OPTIONS.some((o) => o.value === sortValue) && <option value={sortValue}>Custom order</option>}
          </select>
          <div className="flex rounded-lg border border-paper-line bg-white p-1 shadow-sm" role="group" aria-label="View">
            {[
              { value: "grid", icon: LayoutGrid, label: "Grid view" },
              { value: "list", icon: List, label: "List view" },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => changeView(value)}
                aria-pressed={view === value}
                title={label}
                aria-label={label}
                className={`flex h-9 w-10 items-center justify-center rounded-md transition ${
                  view === value ? "bg-brand-700 text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Genre chips */}
      {meta.genres.length > 0 && (
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {[{ name: "", label: "All", count: meta.totalBooks }, ...meta.genres].map((g) => {
            const active = genre === g.name;
            return (
              <button
                key={g.name || "all"}
                type="button"
                onClick={() => updateParams({ genre: g.name, page: 1 })}
                aria-pressed={active}
                className={`chip ${
                  active
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-paper-line bg-white text-ink-soft hover:border-brand-300 hover:text-ink"
                }`}
              >
                {g.label ?? g.name}
                <span className={`text-xs ${active ? "text-white/75" : "text-ink-muted"}`}>{g.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      <div className="mb-4 mt-4 flex min-h-6 items-center justify-between text-sm text-ink-muted">
        <span aria-live="polite">{resultsLabel}</span>
        {filtering && !loading && (
          <button type="button" onClick={clearFilters} className="font-medium text-brand-700 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {error ? (
        <div role="alert" className="card border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}{" "}
          <button className="font-semibold underline" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </button>
        </div>
      ) : !loading && books.length === 0 ? (
        filtering ? (
          <EmptyState
            icon={SearchX}
            title="No books found"
            message="Nothing matches your search. Try a different spelling, or search in Bangla / English."
            action={
              <button className="btn-secondary" onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={BookPlus}
            title="Your library is empty"
            message="Add your first book to start building the family catalogue."
            action={
              <Link to="/add" className="btn-primary">
                <Plus className="h-4 w-4" aria-hidden /> Add a book
              </Link>
            }
          />
        )
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {loading
            ? Array.from({ length: 12 }, (_, i) => <BookCardSkeleton key={i} />)
            : books.map((book) => <BookCard key={book._id} book={book} linkState={linkState} />)}
        </div>
      ) : (
        <BookTable
          books={books}
          loading={loading}
          sort={sort}
          order={order}
          onSort={handleColumnSort}
          onDelete={requestDelete}
          linkState={linkState}
        />
      )}

      <Pagination page={page} totalPages={totalPages} onChange={changePage} disabled={loading} />

      {/* Mobile add button */}
      <Link
        to="/add"
        state={linkState}
        className="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lift transition active:scale-95 sm:hidden"
        aria-label="Add book"
      >
        <Plus className="h-6 w-6" />
      </Link>

      {dialog}
    </>
  );
}

export default Home;
