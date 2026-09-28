import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { deleteBook, fetchBooks, fetchGenres, getErrorMessage } from "../services/api";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;

const COLUMNS = [
  { field: "name", label: "Book Name" },
  { field: "author", label: "Author" },
  { field: "publisher", label: "Publisher" },
  { field: "genre", label: "Genre" },
];

function Home() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Search, filter, sort and page live in the URL so they survive going to Edit and back.
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const genre = searchParams.get("genre") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const order = searchParams.get("order") === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number.parseInt(searchParams.get("page"), 10) || 1);
  // Passed to Add/Edit so they can return to this exact list view.
  const listSearch = searchParams.toString() ? `?${searchParams}` : "";

  const [searchInput, setSearchInput] = useState(q);
  const [books, setBooks] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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

  // Debounce typing, then search the whole database from page 1.
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
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Could not load books"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, genre, sort, order, page, reloadKey, updateParams]);

  useEffect(() => {
    fetchGenres()
      .then(({ data }) => setGenres(data))
      .catch(() => setGenres([]));
  }, [reloadKey]);

  const handleDelete = async (book) => {
    if (!window.confirm(`Delete "${book.name}"?`)) return;
    try {
      await deleteBook(book._id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete the book"));
    }
  };

  const handleSort = (field) => {
    if (sort === field) {
      updateParams({ order: order === "asc" ? "desc" : "asc", page: 1 });
    } else {
      updateParams({ sort: field, order: "asc", page: 1 });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold">Book List</h1>
        <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <input
          type="search"
          placeholder="Search by name, author, publisher or genre…"
          className="border p-2 rounded w-full md:w-1/2"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <select
          className="border p-2 rounded w-full md:w-1/4"
          value={genre}
          onChange={(e) => updateParams({ genre: e.target.value, page: 1 })}
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full md:w-auto"
          onClick={() => navigate("/add", { state: { listSearch } })}
        >
          Add Book
        </button>
      </div>

      {error && (
        <div role="alert" className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-center">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-600 mb-2">
        {loading ? "Loading…" : `${totalBooks} book${totalBooks === 1 ? "" : "s"} found`}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 bg-white">
          <thead className="bg-gray-200">
            <tr>
              {COLUMNS.map(({ field, label }) => (
                <th key={field} className="border p-2">
                  <button type="button" className="font-bold w-full" onClick={() => handleSort(field)}>
                    {label} {sort === field ? (order === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
              ))}
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && books.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="text-center p-4">
                  {q || genre ? "No books match your search." : "No books yet. Click “Add Book” to add one."}
                </td>
              </tr>
            ) : (
              books.map((book) => (
                <tr key={book._id} className="text-center">
                  {COLUMNS.map(({ field }) => (
                    <td key={field} className="border p-2">
                      {book[field]}
                    </td>
                  ))}
                  <td className="border p-2 whitespace-nowrap">
                    <button
                      className="text-sm text-blue-600 hover:underline px-2"
                      onClick={() => navigate(`/update/${book._id}`, { state: { listSearch } })}
                    >
                      Edit
                    </button>
                    <button className="text-sm text-red-600 hover:underline px-2" onClick={() => handleDelete(book)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center items-center mt-6 gap-4">
        <button
          onClick={() => updateParams({ page: page - 1 })}
          disabled={page <= 1 || loading}
          className="bg-gray-300 text-gray-700 px-3 py-1 rounded disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-lg font-semibold">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => updateParams({ page: page + 1 })}
          disabled={page >= totalPages || loading}
          className="bg-gray-300 text-gray-700 px-3 py-1 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Home;
