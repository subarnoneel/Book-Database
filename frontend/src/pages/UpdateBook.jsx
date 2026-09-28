import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BookForm from "../components/BookForm";
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
      <div className="p-6 max-w-md mx-auto text-center">
        <p role="alert" className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </p>
        <Link to="/home" className="text-blue-600 underline">
          Back to the book list
        </Link>
      </div>
    );
  }

  if (!book) return <p className="p-6 text-center text-gray-500">Loading…</p>;

  return (
    <BookForm
      title="Update Book"
      submitLabel="Save Changes"
      initialValues={book}
      onSubmit={(values) => updateBook(id, values)}
    />
  );
}

export default UpdateBook;
