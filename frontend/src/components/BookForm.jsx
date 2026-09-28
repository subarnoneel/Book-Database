import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import BookCover from "./BookCover";
import Combobox from "./Combobox";
import { useToast } from "../context/ToastContext";
import useLibraryMeta from "../hooks/useLibraryMeta";
import { getErrorMessage } from "../services/api";

const EMPTY_BOOK = { name: "", author: "", publisher: "", genre: "" };
const QUICK_GENRES = 8;

function Field({ id, label, optional = false, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-muted">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// Shared by AddBook and UpdateBook. `onSubmit` receives the four book fields and
// returns the saved book.
function BookForm({ mode, initialValues, onSubmit }) {
  const isEdit = mode === "edit";
  const [book, setBook] = useState(EMPTY_BOOK);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [keptForNext, setKeptForNext] = useState(false);
  const titleRef = useRef(null);
  const meta = useLibraryMeta();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Where to go after saving or cancelling: the details page or the list view the user came from.
  const listSearch = location.state?.listSearch ?? "";
  const returnTo = location.state?.returnTo ?? `/home${listSearch}`;

  useEffect(() => {
    if (initialValues) {
      setBook({
        name: initialValues.name ?? "",
        author: initialValues.author ?? "",
        publisher: initialValues.publisher ?? "",
        genre: initialValues.genre ?? "",
      });
    }
  }, [initialValues]);

  const setField = (name, value) => {
    setBook((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const addAnother = e.nativeEvent.submitter?.value === "another";
    setError("");
    setFieldErrors({});
    setSubmitting(true);
    try {
      const { data: saved } = await onSubmit(book);
      if (addAnother) {
        toast.success(`Added "${saved.name}". Ready for the next one.`);
        setBook((prev) => ({ ...EMPTY_BOOK, author: prev.author, publisher: prev.publisher, genre: prev.genre }));
        setKeptForNext(true);
        setSubmitting(false);
        titleRef.current?.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast.success(isEdit ? "Changes saved" : `Added "${saved.name}"`);
      navigate(isEdit ? returnTo : `/books/${saved._id}`, { state: { listSearch } });
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(err.response?.data?.errors ?? {});
      setSubmitting(false);
    }
  };

  // Publisher is optional: it is often unknown for older books.
  const fieldProps = (name, { required = true } = {}) => ({
    id: name,
    name,
    value: book[name],
    required,
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `${name}-error` : undefined,
    className: `input ${fieldErrors[name] ? "input-error" : ""}`,
  });
  const comboProps = (name, options) => ({
    ...fieldProps(name, { required: name !== "publisher" }),
    options,
    onChange: (value) => setField(name, value),
  });

  const quickGenres = [...meta.genres].sort((a, b) => b.count - a.count).slice(0, QUICK_GENRES);

  return (
    <>
      <Link to={returnTo} state={{ listSearch }} className="btn-ghost -ml-3 mb-4">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {isEdit ? "Back" : "Back to library"}
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-brand-900">{isEdit ? "Edit book" : "Add a book"}</h1>
        <p className="mt-1 text-ink-soft">
          {isEdit ? "Update the details below." : "Type in Bangla or English. Suggestions appear as you type."}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
        <form onSubmit={handleSubmit} className="card space-y-5 p-5 sm:p-7">
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {keptForNext && !error && (
            <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Saved. Author, publisher and genre were kept for the next book; change them if needed.
            </div>
          )}

          <Field id="name" label="Title" error={fieldErrors.name}>
            <input
              {...fieldProps("name")}
              onChange={(e) => setField("name", e.target.value)}
              autoComplete="off"
              ref={titleRef}
              autoFocus={!isEdit}
              className={`${fieldProps("name").className} text-lg`}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="author" label="Author" error={fieldErrors.author}>
              <Combobox {...comboProps("author", meta.authors)} emptyText="No authors saved yet. Type a new one." />
            </Field>
            <Field id="publisher" label="Publisher" optional error={fieldErrors.publisher}>
              <Combobox
                {...comboProps("publisher", meta.publishers)}
                placeholder="Leave blank if unknown"
                emptyText="No publishers saved yet. Type a new one."
              />
            </Field>
          </div>

          <Field id="genre" label="Genre" error={fieldErrors.genre}>
            <Combobox
              {...comboProps("genre", meta.genres.map((g) => g.name))}
              placeholder="Pick one or type a new genre"
              emptyText="No genres saved yet. Type a new one."
            />
            {quickGenres.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {quickGenres.map((g) => {
                  const active = book.genre === g.name;
                  return (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => setField("genre", g.name)}
                      aria-pressed={active}
                      className={`chip py-1 text-xs ${
                        active
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-paper-line bg-paper text-ink-soft hover:border-brand-300"
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          {/* Primary button first in the DOM so pressing Enter saves normally; shown rightmost. */}
          <div className="flex flex-col gap-2 border-t border-paper-line pt-5 sm:flex-row-reverse sm:justify-start">
            <button type="submit" value="save" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Add book"}
            </button>
            {!isEdit && (
              <button type="submit" value="another" className="btn-secondary" disabled={submitting}>
                Save &amp; add another
              </button>
            )}
            <Link to={returnTo} state={{ listSearch }} className="btn-ghost">
              Cancel
            </Link>
          </div>
        </form>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="label">Preview</p>
            <BookCover title={book.name || "Book title"} author={book.author || "Author"} />
          </div>
        </aside>
      </div>
    </>
  );
}

export default BookForm;
