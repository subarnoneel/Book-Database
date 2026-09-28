import mongoose from "mongoose";
import { normalizeText } from "../utils/text.js";

const TEXT_FIELDS = ["name", "author", "publisher", "genre"];

const bookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    publisher: { type: String, required: true, trim: true },
    genre: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Bangla letters like য় can be typed as one code point or two; store one form
// so that search and duplicate genres behave consistently.
bookSchema.pre("validate", function () {
  for (const field of TEXT_FIELDS) {
    if (typeof this[field] === "string") this[field] = normalizeText(this[field]);
  }
});

bookSchema.index({ name: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ genre: 1 });

export const EDITABLE_FIELDS = TEXT_FIELDS;

const Book = mongoose.model("Book", bookSchema);
export default Book;
