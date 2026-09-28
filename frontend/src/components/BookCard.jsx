import { Link } from "react-router-dom";
import BookCover from "./BookCover";

function BookCard({ book, linkState }) {
  return (
    <Link
      to={`/books/${book._id}`}
      state={linkState}
      className="group flex flex-col rounded-xl p-2 transition hover:bg-white hover:shadow-card"
    >
      <div className="transition duration-200 group-hover:-translate-y-1">
        <BookCover title={book.name} author={book.author} />
      </div>
      <div className="mt-3 px-1">
        <h3 className="line-clamp-2 font-serif text-[0.95rem] font-semibold leading-snug text-ink group-hover:text-brand-700">
          {book.name}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-ink-soft">{book.author}</p>
        <p className="mt-1.5 line-clamp-1 text-xs font-medium uppercase tracking-wide text-brand-600">{book.genre}</p>
      </div>
    </Link>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="p-2">
      <div className="skeleton aspect-[3/4] w-full" />
      <div className="skeleton mt-3 h-4 w-4/5" />
      <div className="skeleton mt-2 h-3 w-3/5" />
    </div>
  );
}

export default BookCard;
