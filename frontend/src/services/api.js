import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

// Lets AuthContext react when the server says the session is gone.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && !isAuthCall && onUnauthorized) onUnauthorized();
    return Promise.reject(error);
  }
);

// Turns any axios error into a message suitable for showing to the user.
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.request && !error.response) return "Cannot reach the server. Check your internet connection.";
  return fallback;
};

// Books
export const fetchBooks = ({ q, genre, sort, order, page = 1, limit = 10 } = {}) =>
  API.get("/books", { params: { q: q || undefined, genre: genre || undefined, sort, order, page, limit } });

export const fetchBookById = (id) => API.get(`/books/${id}`);

export const fetchMeta = () => API.get("/books/meta");

export const addBook = (book) => API.post("/books", book);

export const updateBook = (id, book) => API.put(`/books/${id}`, book);

export const deleteBook = (id) => API.delete(`/books/${id}`);

// The whole library as a PDF file (a Blob).
export const downloadBooksPdf = () => API.get("/books/export/pdf", { responseType: "blob", timeout: 120_000 });

// Distinct values of "author" | "publisher" | "genre" with their book counts.
export const fetchFieldValues = (field) => API.get("/books/values", { params: { field } });

// Renames a value on every book that has it: { field, from, to }.
export const bulkRename = (payload) => API.post("/books/bulk-rename", payload);

// Reads book details from photos. `images` is [{ data: base64, mimeType }].
// The AI can take a while, so this call gets a longer timeout.
export const scanBook = (images) => API.post("/scan", { images }, { timeout: 120_000 });

export const fetchScanUsage = () => API.get("/scan/usage");

// Auth
export const login = (credentials) => API.post("/auth/login", credentials);

export const logout = () => API.post("/auth/logout");

export const fetchCurrentUser = () => API.get("/auth/me");
