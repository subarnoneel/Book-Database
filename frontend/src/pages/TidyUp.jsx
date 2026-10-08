import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileDown, Loader2, PencilLine, Search, Tags } from "lucide-react";
import EmptyState from "../components/EmptyState";
import RenameDialog from "../components/RenameDialog";
import { useToast } from "../context/ToastContext";
import usePdfDownload from "../hooks/usePdfDownload";
import { fetchFieldValues, getErrorMessage } from "../services/api";
import { plural } from "../utils/format";

const TABS = [
  { field: "author", label: "Author", title: "Authors" },
  { field: "publisher", label: "Publisher", title: "Publishers" },
  { field: "genre", label: "Genre", title: "Genres" },
];

const searchKey = (text) => text.normalize("NFC").toLowerCase();

// Library view filtered to one value, so the result of a rename can be checked.
const libraryLink = (field, value) =>
  field === "genre" ? `/home?genre=${encodeURIComponent(value)}` : `/home?q=${encodeURIComponent(value)}`;

// Bulk-rename authors, publishers and genres (e.g. a publisher that changed its name,
// or two spellings of the same author).
function TidyUp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.find((t) => t.field === searchParams.get("field")) ?? TABS[0];
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [renaming, setRenaming] = useState(null);
  const toast = useToast();
  const pdf = usePdfDownload();

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return fetchFieldValues(tab.field)
      .then(({ data }) => setValues(data))
      .catch((err) => setError(getErrorMessage(err, "Could not load the list")))
      .finally(() => setLoading(false));
  }, [tab.field]);

  useEffect(() => {
    setFilter("");
    load();
  }, [load]);

  const handleDone = ({ modified, to, mergedWith }) => {
    setRenaming(null);
    const where = to ? `“${to}”` : "no publisher";
    toast.success(`Updated ${plural(modified, "book")} to ${where}${mergedWith ? " (merged)" : ""}`);
    load();
  };

  const shown = filter ? values.filter((v) => searchKey(v.value).includes(searchKey(filter))) : values;

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-brand-900 sm:text-4xl">Tidy up names</h1>
          <p className="mt-2 text-ink-soft">
            Rename an author, publisher or genre on <strong>all</strong> its books at once. For example, when a
            publisher changes its name, or to fix a spelling. Choosing a name that already exists merges the two.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={pdf.download} disabled={pdf.downloading}>
          {pdf.downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="h-4 w-4" aria-hidden />}
          {pdf.downloading ? "Preparing PDF…" : "Download a PDF record first"}
        </button>
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg border border-paper-line bg-white p-1 shadow-sm" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.field}
              type="button"
              role="tab"
              aria-selected={t.field === tab.field}
              onClick={() => setSearchParams({ field: t.field }, { replace: true })}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                t.field === tab.field ? "bg-brand-700 text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Find ${tab.label.toLowerCase()}…`}
            aria-label={`Find ${tab.label.toLowerCase()}`}
            className="input pl-9"
          />
        </div>
      </div>

      {error ? (
        <div role="alert" className="card border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="card divide-y divide-paper-line">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="skeleton h-6 w-1/2" />
            </div>
          ))}
        </div>
      ) : values.length === 0 ? (
        <EmptyState icon={Tags} title={`No ${tab.title.toLowerCase()} yet`} message="Add some books first." />
      ) : (
        <>
          <p className="mb-2 text-sm text-ink-muted">
            {filter
              ? `${shown.length} of ${plural(values.length, tab.label.toLowerCase())}`
              : plural(values.length, tab.label.toLowerCase())}
          </p>
          <ul className="card divide-y divide-paper-line">
            {shown.map((v) => (
              <li key={v.value} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 break-words font-medium text-ink">{v.value}</span>
                <Link
                  to={libraryLink(tab.field, v.value)}
                  className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                  title="Show these books in the library"
                >
                  {plural(v.count, "book")}
                </Link>
                <button
                  type="button"
                  className="btn-ghost shrink-0 px-3 py-2"
                  onClick={() => setRenaming(v)}
                  aria-label={`Rename ${v.value}`}
                >
                  <PencilLine className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Rename</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-muted">No match for “{filter}”.</li>}
          </ul>
        </>
      )}

      <RenameDialog
        field={tab.field}
        label={tab.label}
        target={renaming}
        values={values}
        onDone={handleDone}
        onCancel={() => setRenaming(null)}
      />
    </>
  );
}

export default TidyUp;
