import axios from "axios";

// Base URL of your backend (relative path so Vite proxy works)
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api" // just /api, let proxy handle forwarding to port 5000
});

// Books
export const fetchBooks = (page = 1, limit = 5) => API.get(`/books?page=${page}&limit=${limit}`);          // GET all books
export const addBook = (book) => API.post("/books", book); // POST new book
export const updateBook = (id, book) => API.put(`/books/${id}`, book); // PUT update book
export const deleteBook = (id) => API.delete(`/books/${id}`);          // DELETE book

// Login
export const login = (credentials) => API.post("/login", credentials); // POST login
