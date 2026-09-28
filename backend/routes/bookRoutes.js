import express from "express";
import {
  getBooks,
  getGenres,
  getBookById,
  addBook,
  updateBook,
  deleteBook,
} from "../controllers/bookController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", asyncHandler(getBooks));
router.post("/", asyncHandler(addBook));
router.get("/genres", asyncHandler(getGenres));
router.get("/:id", asyncHandler(getBookById));
router.put("/:id", asyncHandler(updateBook));
router.delete("/:id", asyncHandler(deleteBook));

export default router;
