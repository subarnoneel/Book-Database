import BookForm from "../components/BookForm";
import { addBook } from "../services/api";

function AddBook() {
  return <BookForm title="Add New Book" submitLabel="Add Book" onSubmit={addBook} />;
}

export default AddBook;
