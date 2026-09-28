import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchGenres, getErrorMessage } from "../services/api";

const EMPTY_BOOK = { name: "", author: "", publisher: "", genre: "" };

const FIELDS = [
  { name: "name", label: "Book Name" },
  { name: "author", label: "Author" },
  { name: "publisher", label: "Publisher" },
];

const inputClass = "border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400";

// Shared by AddBook and UpdateBook. `onSubmit` receives the four book fields.
function BookForm({ title, submitLabel, initialValues, onSubmit }) {
  const [book, setBook] = useState(EMPTY_BOOK);
  const [genres, setGenres] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Return to the list view (search, filter, page) the user came from.
  const backToList = `/home${location.state?.listSearch ?? ""}`;

  useEffect(() => {
    if (initialValues) {
      setBook({
        name: initialValues.name ?? "",
        author: initialValues.author ?? "",
        publisher: initialValues.publisher ?? "",
        genre: initialValues.genre ?? "",
      });
    }
  }, [initialValues]);

  useEffect(() => {
    fetchGenres()
      .then(({ data }) => setGenres(data))
      .catch(() => setGenres([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBook((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSubmitting(true);
    try {
      await onSubmit(book);
      navigate(backToList);
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(err.response?.data?.errors ?? {});
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">{title}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white p-6 rounded shadow-md">
        {error && (
          <div role="alert" className="bg-red-100 text-red-700 px-4 py-2 rounded text-center">
            {error}
          </div>
        )}

        {FIELDS.map(({ name, label }) => (
          <div key={name}>
            <label htmlFor={name} className="block mb-1 font-semibold text-gray-700">
              {label}
            </label>
            <input
              id={name}
              type="text"
              name={name}
              className={inputClass}
              value={book[name]}
              onChange={handleChange}
              required
            />
            {fieldErrors[name] && <p className="text-sm text-red-600 mt-1">{fieldErrors[name]}</p>}
          </div>
        ))}

        <div>
          <label htmlFor="genre" className="block mb-1 font-semibold text-gray-700">
            Genre
          </label>
          <input
            id="genre"
            type="text"
            name="genre"
            list="genre-options"
            placeholder="Pick an existing genre or type a new one"
            className={inputClass}
            value={book.genre}
            onChange={handleChange}
            required
          />
          <datalist id="genre-options">
            {genres.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          {fieldErrors.genre && <p className="text-sm text-red-600 mt-1">{fieldErrors.genre}</p>}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(backToList)}
            className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-60"
          >
            {submitting ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default BookForm;
