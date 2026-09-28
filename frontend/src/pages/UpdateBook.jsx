import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookX } from "lucide-react";
import BookForm from "../components/BookForm";
import EmptyState from "../components/EmptyState";
import { fetchBookById, getErrorMessage, updateBook } from "../services/api";

function UpdateBook() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setBook(null);
    setError("");
    fetchBookById(id)
      .then(({ data }) => setBook(data))
      .catch((err) => setError(getErrorMessage(err, "Could not load this book")));
  }, [id]);

  if (error) {
    return (
      <>
        <Link to="/home" className="btn-ghost -ml-3 mb-6">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to library
        </Link>
        <EmptyState icon={BookX} title="Book not found" message={error} />
      </>
    );
  }

  if (!book) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-48" />
        <div className="skeleton h-80 w-full max-w-3xl" />
      </div>
    );
  }

  return <BookForm mode="edit" initialValues={book} onSubmit={(values) => updateBook(id, values)} />;
}

export default UpdateBook;
