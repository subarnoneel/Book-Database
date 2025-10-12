import express from "express";
import {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
} from "../controllers/bookController.js";
import Book from "../models/Book.js";

const router = express.Router();

router.get("/", getBooks);
router.post("/", addBook);
router.put("/:id", updateBook);
router.delete("/:id", deleteBook);

router.get("/genres", async (req, res) => {
  try {
    const genres = await Book.distinct("genre"); // MongoDB magic: gets all unique genre values
    res.json(genres);
  } catch (error) {
    console.error("Error fetching genres:", error);
    res.status(500).json({ message: "Server error while fetching genres" });
  }
});

export default router;
