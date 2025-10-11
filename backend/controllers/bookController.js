import Book from "../models/Book.js";

// GET all books (with pagination)
export const getBooks = async (req, res) => {
  try {
    console.log("GET /api/books hit");

    // Get ?page and ?limit from query params (default to page=1, limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate how many documents to skip
    const skip = (page - 1) * limit;

    // Fetch books with pagination
    const books = await Book.find().skip(skip).limit(limit);

    // Count total number of books for pagination info
    const totalBooks = await Book.countDocuments();

    console.log(
      `Books fetched successfully (Page ${page}, Limit ${limit}):`,
      books.length
    );

    // Send response including metadata
    res.status(200).json({
      totalBooks,
      totalPages: Math.ceil(totalBooks / limit),
      currentPage: page,
      books,
    });
  } catch (err) {
    console.error("Error in getBooks:", err.message);
    res.status(500).json({ error: err.message });
  }
};



// ADD new book
export const addBook = async (req, res) => {
  try {
    const { name, author, publisher, genre } = req.body;
    const newBook = new Book({ name, author, publisher, genre });
    await newBook.save();
    res.status(201).json(newBook);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE existing book
export const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Book.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE a book
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    await Book.findByIdAndDelete(id);
    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
