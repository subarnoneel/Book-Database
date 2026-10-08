import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

// Modal confirmation built on <dialog>, which handles focus trapping and Esc for us.
// `danger` (default) styles it for destructive actions such as deleting; set it to false for
// "are you sure?" questions like adding a possible duplicate.
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  busy = false,
  busyLabel = "Deleting…",
  danger = true,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        // Click on the backdrop (outside the panel) closes it.
        if (e.target === ref.current && !busy) onCancel();
      }}
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-ink shadow-lift"
    >
      <div className="p-6">
        <div className="flex gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${danger ? "bg-red-50" : "bg-amber-50"}`}>
            <AlertTriangle className={`h-5 w-5 ${danger ? "text-red-600" : "text-amber-600"}`} aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
