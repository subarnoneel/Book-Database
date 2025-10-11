import { useState, useEffect } from "react";
import { updateBook, fetchBooks } from "../services/api";
import { useNavigate, useParams } from "react-router-dom";

function UpdateBook() {
  const [book, setBook] = useState({ name: "", author: "", publisher: "", genre: "" });
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const loadBook = async () => {
      const { data } = await fetchBooks();
      const existingBook = data.find((b) => b._id === id);
      if (existingBook) setBook(existingBook);
    };
    loadBook();
  }, [id]);

  const handleChange = (e) => {
    setBook({ ...book, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateBook(id, book);
    navigate("/");
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">Update Book</h1>
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
        <input
          type="text"
          name="genre"
          placeholder="Genre"
          className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={book.genre}
          onChange={handleChange}
          required
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}

export default UpdateBook;
