import axios from "axios";

// ✅ Create one axios instance for all API calls
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api", // /api so Vite proxy handles it
});

// ✅ Books
export const fetchBooks = (page = 1, limit = 5) =>
  API.get(`/books?page=${page}&limit=${limit}`);

export const addBook = (book) => API.post("/books", book);

export const updateBook = (id, book) => API.put(`/books/${id}`, book);

export const deleteBook = (id) => API.delete(`/books/${id}`);

// ✅ FIXED: use the same API instance instead of undefined variable
export const fetchGenres = () => API.get("/books/genres");

// ✅ Login
export const login = (credentials) => API.post("/login", credentials);
