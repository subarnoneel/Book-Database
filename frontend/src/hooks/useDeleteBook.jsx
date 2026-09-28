import { useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../context/ToastContext";
import { deleteBook, getErrorMessage } from "../services/api";

// Confirm-then-delete flow shared by the list and the details page.
// Render `dialog` somewhere in the component and call `requestDelete(book)`.
export default function useDeleteBook({ onDeleted } = {}) {
  const [book, setBook] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const confirm = async () => {
    setBusy(true);
    try {
      await deleteBook(book._id);
      toast.success(`Deleted "${book.name}"`);
      setBook(null);
      onDeleted?.(book);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the book"));
    } finally {
      setBusy(false);
    }
  };

  const dialog = (
    <ConfirmDialog
      open={!!book}
      title="Delete this book?"
      message={book ? `"${book.name}" by ${book.author} will be removed from the library. This cannot be undone.` : ""}
      confirmLabel="Delete book"
      busy={busy}
      onConfirm={confirm}
      onCancel={() => setBook(null)}
    />
  );

  return { requestDelete: setBook, dialog };
}
