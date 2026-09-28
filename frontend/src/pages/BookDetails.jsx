import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookX, Building2, CalendarPlus, History, Pencil, Tag, Trash2, UserRound } from "lucide-react";
import BookCard from "../components/BookCard";
import BookCover from "../components/BookCover";
import EmptyState from "../components/EmptyState";
import useDeleteBook from "../hooks/useDeleteBook";
import { fetchBookById, fetchBooks, getErrorMessage } from "../services/api";
import { formatDate } from "../utils/format";

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
      <dt className="w-28 shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-medium text-ink">{children}</dd>
    </div>
  );
}

function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const listSearch = location.state?.listSearch ?? "";
  const backToList = `/home${listSearch}`;

  const [book, setBook] = useState(null);
  const [error, setError] = useState("");
  const [moreByAuthor, setMoreByAuthor] = useState([]);
  const { requestDelete, dialog } = useDeleteBook({ onDeleted: () => navigate(backToList, { replace: true }) });

  useEffect(() => {
    let cancelled = false;
    setBook(null);
    setError("");
    setMoreByAuthor([]);

    fetchBookById(id)
      .then(({ data }) => {
        if (cancelled) return;
        setBook(data);
        return fetchBooks({ q: data.author, sort: "name", order: "asc", limit: 7 }).then(({ data: more }) => {
          if (!cancelled) setMoreByAuthor(more.books.filter((b) => b._id !== data._id && b.author === data.author).slice(0, 6));
        });
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Could not load this book"));
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const backLink = (
    <Link to={backToList} className="btn-ghost -ml-3 mb-6">
      <ArrowLeft className="h-4 w-4" aria-hidden /> Back to library
    </Link>
  );

  if (error) {
    return (
      <>
        {backLink}
        <EmptyState icon={BookX} title="Book not found" message={error} />
      </>
    );
  }

  if (!book) {
    return (
      <>
        {backLink}
        <div className="flex flex-col gap-8 sm:flex-row">
          <div className="skeleton aspect-[3/4] w-40 sm:w-48" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-9 w-3/4" />
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton mt-6 h-40 w-full" />
          </div>
        </div>
      </>
    );
  }

  const authorSearch = `/home?q=${encodeURIComponent(book.author)}`;

  return (
    <>
      {backLink}

      <article className="flex flex-col gap-8 sm:flex-row sm:gap-10">
        <div className="mx-auto sm:mx-0">
          <BookCover title={book.name} author={book.author} size="lg" />
        </div>

        <div className="min-w-0 flex-1">
          <Link
            to={`/home?genre=${encodeURIComponent(book.genre)}`}
            className="text-xs font-semibold uppercase tracking-wider text-brand-600 hover:underline"
          >
            {book.genre}
          </Link>
          <h1 className="mt-2 break-words text-3xl font-bold leading-tight text-ink sm:text-4xl">{book.name}</h1>
          <p className="mt-2 text-lg text-ink-soft">
            by{" "}
            <Link to={authorSearch} className="font-medium text-brand-700 hover:underline">
              {book.author}
            </Link>
          </p>

          <dl className="card mt-6 divide-y divide-paper-line px-5">
            <DetailRow icon={UserRound} label="Author">
              {book.author}
            </DetailRow>
            <DetailRow icon={Building2} label="Publisher">
              {book.publisher || <span className="font-normal text-ink-muted">Not known</span>}
            </DetailRow>
            <DetailRow icon={Tag} label="Genre">
              {book.genre}
            </DetailRow>
            {book.createdAt && (
              <DetailRow icon={CalendarPlus} label="Added">
                {formatDate(book.createdAt)}
              </DetailRow>
            )}
            {book.updatedAt && book.updatedAt !== book.createdAt && (
              <DetailRow icon={History} label="Last edited">
                {formatDate(book.updatedAt)}
              </DetailRow>
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={`/update/${book._id}`}
              state={{ listSearch, returnTo: `/books/${book._id}` }}
              className="btn-primary"
            >
              <Pencil className="h-4 w-4" aria-hidden /> Edit details
            </Link>
            <button
              type="button"
              onClick={() => requestDelete(book)}
              className="btn-secondary text-red-600 hover:border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Delete
            </button>
          </div>
        </div>
      </article>

      {moreByAuthor.length > 0 && (
        <section className="mt-14">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold">More by {book.author}</h2>
            <Link to={authorSearch} className="shrink-0 text-sm font-medium text-brand-700 hover:underline">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {moreByAuthor.map((b) => (
              <BookCard key={b._id} book={b} linkState={{ listSearch }} />
            ))}
          </div>
        </section>
      )}

      {dialog}
    </>
  );
}

export default BookDetails;
