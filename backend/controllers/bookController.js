import mongoose from "mongoose";
import Book, { EDITABLE_FIELDS } from "../models/Book.js";
import { normalizeText, escapeRegex } from "../utils/text.js";
import { HttpError } from "../utils/httpError.js";
import { writeBooksPdf } from "../services/pdfExport.js";

const SORTABLE_FIELDS = ["name", "author", "publisher", "genre", "createdAt"];
const MAX_LIMIT = 100;
// Bangla collation sorts Bangla text in alphabetical order; English still sorts A–Z.
// numericOrdering puts "Part 2" before "Part 10".
const COLLATION = { locale: "bn", strength: 1, numericOrdering: true };

const toPositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Only copy known fields from the request body, normalized.
const pickBookFields = (body = {}) => {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined && body[field] !== null) {
      data[field] = normalizeText(body[field]);
    }
  }
  return data;
};

const assertValidId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, "Invalid book id");
};

// GET /api/books?q=&genre=&sort=&order=&page=&limit=
export const getBooks = async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(toPositiveInt(req.query.limit, 10), MAX_LIMIT);
  const sortField = SORTABLE_FIELDS.includes(req.query.sort) ? req.query.sort : "createdAt";
  const order = req.query.order === "asc" ? 1 : req.query.order === "desc" ? -1 : sortField === "createdAt" ? -1 : 1;

  const filter = {};
  const q = typeof req.query.q === "string" ? normalizeText(req.query.q) : "";
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: regex }, { author: regex }, { publisher: regex }, { genre: regex }];
  }
  if (typeof req.query.genre === "string" && req.query.genre) {
    filter.genre = normalizeText(req.query.genre);
  }

  const [books, totalBooks] = await Promise.all([
    Book.find(filter)
      .collation(COLLATION)
      .sort({ [sortField]: order, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Book.countDocuments(filter),
  ]);

  res.json({
    books,
    totalBooks,
    totalPages: Math.max(1, Math.ceil(totalBooks / limit)),
    currentPage: page,
  });
};

// GET /api/books/meta
// Library totals, genres with counts (for filter chips) and the distinct authors and
// publishers (for form autocomplete).
export const loadLibraryMeta = async () => {
  const [totalBooks, genreCounts, authors, publishers] = await Promise.all([
    Book.countDocuments(),
    Book.aggregate([{ $group: { _id: "$genre", count: { $sum: 1 } } }]),
    Book.distinct("author"),
    Book.distinct("publisher"),
  ]);
  const collator = new Intl.Collator("bn", { numeric: true });
  const sortNames = (names) => names.filter(Boolean).sort(collator.compare);

  return {
    totalBooks,
    genres: genreCounts
      .filter((g) => g._id)
      .map((g) => ({ name: g._id, count: g.count }))
      .sort((a, b) => collator.compare(a.name, b.name)),
    authors: sortNames(authors),
    publishers: sortNames(publishers),
  };
};

export const getMeta = async (req, res) => {
  res.json(await loadLibraryMeta());
};

// GET /api/books/:id
export const getBookById = async (req, res) => {
  assertValidId(req.params.id);
  const book = await Book.findById(req.params.id);
  if (!book) throw new HttpError(404, "Book not found");
  res.json(book);
};

// POST /api/books
export const addBook = async (req, res) => {
  const book = await Book.create(pickBookFields(req.body));
  res.status(201).json(book);
};

// PUT /api/books/:id
export const updateBook = async (req, res) => {
  assertValidId(req.params.id);
  const book = await Book.findById(req.params.id);
  if (!book) throw new HttpError(404, "Book not found");

  book.set(pickBookFields(req.body));
  await book.save();
  res.json(book);
};

// DELETE /api/books/:id
export const deleteBook = async (req, res) => {
  assertValidId(req.params.id);
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) throw new HttpError(404, "Book not found");
  res.json({ message: "Book deleted successfully" });
};

// GET /api/books/export/pdf
// Every book as a printable PDF table, sorted by title (Bangla alphabetical order).
export const exportPdf = async (req, res) => {
  const books = await Book.find().collation(COLLATION).sort({ name: 1, _id: 1 }).lean();
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="home-library-${date}.pdf"`);
  writeBooksPdf(books, res, { title: "Home Library: Book list" });
};

// Fields that can be renamed in bulk.
const RENAMABLE_FIELDS = ["author", "publisher", "genre"];

const assertRenamableField = (field) => {
  if (!RENAMABLE_FIELDS.includes(field)) {
    throw new HttpError(400, "Field must be one of: author, publisher, genre");
  }
};

// GET /api/books/values?field=author|publisher|genre
// Each distinct value of a field with its number of books.
export const getFieldValues = async (req, res) => {
  const { field } = req.query;
  assertRenamableField(field);
  const groups = await Book.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  const collator = new Intl.Collator("bn", { numeric: true });
  res.json(
    groups
      .filter((g) => g._id)
      .map((g) => ({ value: g._id, count: g.count }))
      .sort((a, b) => collator.compare(a.value, b.value))
  );
};

// POST /api/books/bulk-rename  { field, from, to }
// Changes `from` to `to` on every book with exactly that value. If `to` is already used
// by other books, the two groups merge. Publisher may be cleared (to = "").
export const bulkRename = async (req, res) => {
  const { field } = req.body ?? {};
  assertRenamableField(field);
  const from = typeof req.body.from === "string" ? normalizeText(req.body.from) : "";
  const to = typeof req.body.to === "string" ? normalizeText(req.body.to) : "";

  if (!from) throw new HttpError(400, `Choose the ${field} to rename`);
  if (!to && field !== "publisher") throw new HttpError(400, `The new ${field} cannot be empty`);
  if (from === to) throw new HttpError(400, `The new ${field} is the same as the current one`);

  const matched = await Book.countDocuments({ [field]: from });
  if (matched === 0) throw new HttpError(404, `No books have the ${field} "${from}"`);
  const mergedWith = to ? await Book.countDocuments({ [field]: to }) : 0;

  const result = await Book.updateMany({ [field]: from }, { $set: { [field]: to } });
  res.json({ field, from, to, modified: result.modifiedCount, mergedWith });
};
