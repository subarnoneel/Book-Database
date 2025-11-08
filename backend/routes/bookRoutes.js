import express from "express";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
} from "../controllers/bookController.js";
import Book from "../models/Book.js";

const router = express.Router();

// All books
router.get("/", getBooks);
router.post("/", addBook);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);

// ✅ 1. Place this before "/:id"
router.get("/genres", async (req, res) => {
  try {
    const genres = await Book.distinct("genre");
    res.json(genres);
  } catch (error) {
    console.error("Error fetching genres:", error);
    res.status(500).json({ message: "Server error while fetching genres" });
  }
});

// ✅ 2. Then fetch single book by ID
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ message: "Server error while fetching book" });
  }
});

export default router;
