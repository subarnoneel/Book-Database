import { useEffect, useRef, useState } from "react";
import { AlertTriangle, PencilLine } from "lucide-react";
import Combobox from "./Combobox";
import { bulkRename, getErrorMessage } from "../services/api";
import { plural } from "../utils/format";

// Same clean-up the server applies, so the preview matches what will happen.
const clean = (text) => text.normalize("NFC").replace(/\s+/g, " ").trim();

/**
 * Renames one author/publisher/genre value on all its books.
 * `target` is { value, count } or null (closed); `values` are all values of the field.
 */
function RenameDialog({ field, label, target, values, onDone, onCancel }) {
  const ref = useRef(null);
  const [newValue, setNewValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (target && !dialog.open) {
      setNewValue(target.value);
      setError("");
      dialog.showModal();
    }
    if (!target && dialog.open) dialog.close();
  }, [target]);

  if (!target) return <dialog ref={ref} />;

  const to = clean(newValue);
  const unchanged = to === target.value;
  const canClear = field === "publisher";
  const mergeTarget = to && !unchanged ? values.find((v) => v.value === to) : null;
  const invalid = unchanged || (!to && !canClear);

  const submit = async (e) => {
    e.preventDefault();
    if (invalid) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await bulkRename({ field, from: target.value, to });
      onDone(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not rename"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      className="w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-0 text-ink shadow-lift"
    >
      <form onSubmit={submit} className="p-6">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50">
            <PencilLine className="h-5 w-5 text-brand-700" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Rename {label.toLowerCase()}</h2>
            <p className="mt-1 break-words text-sm text-ink-soft">
              “{target.value}” is used by {plural(target.count, "book")}. The new name will be applied to all of them.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="rename-to" className="label">
            New {label.toLowerCase()}
          </label>
          <Combobox
            id="rename-to"
            value={newValue}
            onChange={setNewValue}
            options={values.map((v) => v.value).filter((v) => v !== target.value)}
            placeholder={canClear ? "Leave blank to clear the publisher" : ""}
            emptyText={`No other ${label.toLowerCase()} names yet.`}
            className="input"
            inlineList
            autoFocus
          />
        </div>

        <div className="mt-4 min-h-[2.5rem] text-sm">
          {mergeTarget ? (
            <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                “{to}” already has {plural(mergeTarget.count, "book")}. The two will be <strong>merged</strong> into one
                group of {plural(mergeTarget.count + target.count, "book")}. A merge can’t be undone automatically.
              </span>
            </p>
          ) : !to && canClear ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
              The publisher will be removed from {plural(target.count, "book")}.
            </p>
          ) : !invalid ? (
            <p className="text-ink-soft">
              {plural(target.count, "book")} will change from “{target.value}” to “{to}”.
            </p>
          ) : null}
          {error && (
            <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || invalid}>
            {busy ? "Updating…" : `Update ${plural(target.count, "book")}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default RenameDialog;
