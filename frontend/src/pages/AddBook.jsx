import { useState, useEffect } from "react";
import { addBook, fetchGenres } from "../services/api"; // ✅ also import fetchGenres
import { useNavigate } from "react-router-dom";

function AddBook() {
  const [book, setBook] = useState({ name: "", author: "", publisher: "", genre: "" });
  const [genres, setGenres] = useState([]); // ✅ to store all available genres
  const navigate = useNavigate();

  // ✅ fetch all existing genres from backend
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const { data } = await fetchGenres();
        setGenres(data);
      } catch (err) {
        console.error("Error fetching genres:", err);
      }
    };
    loadGenres();
  }, []);

  const handleChange = (e) => {
    setBook({ ...book, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addBook(book);
      navigate("/home", { state: { refresh: true } });
    } catch (err) {
      console.error("Failed to add book:", err);
      alert("Error adding book. Check console for details.");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">Add New Book</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white p-6 rounded shadow-md">
        <input
          type="text"
          name="name"
          placeholder="Book Name"
          className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={book.name}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="author"
          placeholder="Author"
          className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={book.author}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="publisher"
          placeholder="Publisher"
          className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={book.publisher}
          onChange={handleChange}
          required
        />

        {/* ✅ Combined genre input + select dropdown */}
        <div>
          <label className="block mb-2 font-semibold text-gray-700">Genre</label>
          <div className="flex gap-2">
            <select
              className="border p-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={book.genre}
              onChange={(e) => setBook({ ...book, genre: e.target.value })}
            >
              <option value="">Select existing genre</option>
              {genres.map((g, idx) => (
                <option key={idx} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Or type new genre"
              className="border p-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={book.genre}
              onChange={(e) => setBook({ ...book, genre: e.target.value })}
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Add Book
        </button>
      </form>
    </div>
  );
}

export default AddBook;
