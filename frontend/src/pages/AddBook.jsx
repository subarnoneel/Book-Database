import BookForm from "../components/BookForm";
import { addBook } from "../services/api";

function AddBook() {
  return <BookForm mode="add" onSubmit={addBook} />;
}

export default AddBook;
