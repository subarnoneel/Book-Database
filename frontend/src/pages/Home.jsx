import { useState, useEffect } from "react";
import { fetchBooks, deleteBook } from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";

function Home() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const [sortField, setSortField] = useState(""); // "name" or "author"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"
  const navigate = useNavigate();
  const location = useLocation();
  const [openBookId, setOpenBookId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadBooks = async (page = currentPage) => {
    try {
      const { data } = await fetchBooks(page, 5); // 5 books per page
      console.log("Books fetched:", data);
      setBooks(data.books); // backend now sends { books, totalPages, currentPage }
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (err) {
      console.error("Error fetching books:", err);
    }
  };
  

  useEffect(() => {
    loadBooks(currentPage);
  }, [currentPage]);
  

  // Trigger reload if navigated back with state.refresh
  useEffect(() => {
    if (location.state && location.state.refresh) {
      loadBooks();
      navigate(location.pathname, { replace: true, state: {} }); // clear state
    }
  }, [location.state, navigate, location.pathname]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this book?")) {
      await deleteBook(id);
      loadBooks();
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredBooks = Array.isArray(books)
    ? books
        .filter((book) => {
          return (
            (filterGenre ? book.genre === filterGenre : true) &&
            (search
              ? book.name.toLowerCase().includes(search.toLowerCase()) ||
                book.author.toLowerCase().includes(search.toLowerCase()) ||
                book.publisher.toLowerCase().includes(search.toLowerCase()) ||
                book.genre.toLowerCase().includes(search.toLowerCase())
              : true)
          );
        })
        .sort((a, b) => {
          if (!sortField) return 0;
          const aVal = a[sortField].toLowerCase();
          const bVal = b[sortField].toLowerCase();
          if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
          if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
          return 0;
        })
    : [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-6 text-center">Book List</h1>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search..."
          className="border p-2 rounded w-full md:w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border p-2 rounded w-full md:w-1/4"
          value={filterGenre}
          onChange={(e) => setFilterGenre(e.target.value)}
        >
          <option value="">All Genres</option>
          <option value="Fiction">Fiction</option>
          <option value="Non-Fiction">Non-Fiction</option>
          <option value="Sci-Fi">Sci-Fi</option>
          <option value="Romance">Romance</option>
        </select>

        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => navigate("/add")}
        >
          Add Book
        </button>
      </div>
      <button
        className="bg-gray-500 text-white px-4 py-2 rounded float-right"
        onClick={() => {
          localStorage.removeItem("loggedIn");
          navigate("/login");
        }}
      >
        Logout
      </button>

      <table className="w-full border border-gray-300 rounded-lg">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2 cursor-pointer" onClick={() => handleSort("name")}>
              Book Name {sortField === "name" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </th>
            <th className="border p-2 cursor-pointer" onClick={() => handleSort("author")}>
              Author {sortField === "author" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </th>
            <th className="border p-2">Publisher</th>
            <th className="border p-2">Genre</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredBooks.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center p-4">
                No books found.
              </td>
            </tr>
          ) : (
            filteredBooks.map((book) => (
              <tr key={book._id} className="text-center">
                <td className="border p-2">{book.name}</td>
                <td className="border p-2">{book.author}</td>
                <td className="border p-2">{book.publisher}</td>
                <td className="border p-2">{book.genre}</td>
                <td className="border p-2 text-center relative">
                  <div className="relative inline-block text-left">
                    <button
                      onClick={() => setOpenBookId(book._id === openBookId ? null : book._id)}
                      className="inline-flex justify-center items-center w-8 h-8 text-gray-700 hover:bg-gray-200 rounded-full"
                    >
                      ⋮
                    </button>
                    {openBookId === book._id && (
                      <div className="origin-top-right absolute right-0 mt-2 w-28 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => navigate(`/update/${book._id}`)}
                          >
                            Edit
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            onClick={() => handleDelete(book._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="flex justify-center items-center mt-6 gap-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="bg-gray-300 text-gray-700 px-3 py-1 rounded disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-lg font-semibold">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="bg-gray-300 text-gray-700 px-3 py-1 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default Home;
