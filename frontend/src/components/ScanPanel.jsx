import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, RotateCcw, ScanText, Sparkles, X } from "lucide-react";
import { getErrorMessage, scanBook } from "../services/api";
import { prepareImage } from "../utils/image";

const MAX_PHOTOS = 3;

// Touch devices get a "Take photo" button that opens the camera directly.
const hasCamera = () => {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
};

// Take or pick up to 3 photos of one book (cover, title page, spine); the server's AI
// reads them and `onResult` receives { found, title, author, publisher, genre, confidence, notes }.
function ScanPanel({ onResult }) {
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | preparing | reading | done | error
  const [message, setMessage] = useState("");
  const cameraInput = useRef(null);
  const fileInput = useRef(null);

  const read = async (list) => {
    setStatus("reading");
    setMessage("");
    try {
      const { data } = await scanBook(list.map(({ data: d, mimeType }) => ({ data: d, mimeType })));
      if (!data.found) {
        setStatus("error");
        setMessage(
          data.notes || "No book details could be read. Try a closer, well-lit photo of the cover or the title page."
        );
        return;
      }
      onResult(data);
      setStatus("done");
      setMessage(data.notes);
    } catch (err) {
      setStatus("error");
      setMessage(getErrorMessage(err, "Could not read the photo. Please try again."));
    }
  };

  const addFiles = async (fileList) => {
    const files = [...fileList].slice(0, MAX_PHOTOS - photos.length);
    if (files.length === 0) return;
    setStatus("preparing");
    setMessage("");
    try {
      const prepared = await Promise.all(files.map(prepareImage));
      const next = [...photos, ...prepared];
      setPhotos(next);
      await read(next); // read straight away: one tap from photo to filled form
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setStatus("idle");
    setMessage("");
  };

  const busy = status === "preparing" || status === "reading";
  const canAdd = photos.length < MAX_PHOTOS && !busy;

  const pickButtons = (
    <div className="flex flex-wrap gap-2">
      {hasCamera() && (
        <button type="button" className="btn-primary" disabled={!canAdd} onClick={() => cameraInput.current?.click()}>
          <Camera className="h-4 w-4" aria-hidden /> {photos.length ? "Add another photo" : "Take photo"}
        </button>
      )}
      <button
        type="button"
        className={hasCamera() ? "btn-secondary" : "btn-primary"}
        disabled={!canAdd}
        onClick={() => fileInput.current?.click()}
      >
        <ImagePlus className="h-4 w-4" aria-hidden />
        {hasCamera() ? "From gallery" : photos.length ? "Add another photo" : "Choose photo"}
      </button>
    </div>
  );

  return (
    <section className="card overflow-hidden" aria-labelledby="scan-title">
      <div className="flex items-start gap-3 border-b border-paper-line bg-brand-50/60 px-5 py-4 sm:px-7">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
          <ScanText className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 id="scan-title" className="font-sans text-base font-semibold text-ink">
            Fill in from a photo
          </h2>
          <p className="text-sm text-ink-soft">
            Photograph the cover or the title page inside the book. You can add up to {MAX_PHOTOS} photos of the same
            book for better results.
          </p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4 sm:px-7">
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p.previewUrl} alt={`Photo ${i + 1}`} className="h-24 w-20 rounded-md object-cover shadow-card" />
                {!busy && (
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white shadow"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {busy ? (
          <div className="flex items-center gap-3 text-sm text-ink-soft" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden />
            {status === "preparing" ? "Preparing photo…" : "Reading the book details… this usually takes 5–15 seconds."}
          </div>
        ) : (
          pickButtons
        )}

        {status === "done" && (
          <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800" role="status">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              Filled in from the photo. Please check the details below, especially anything marked
              <span className="mx-1 rounded bg-amber-100 px-1.5 text-amber-800">Check</span>, then save.
              {message && <p className="mt-1 text-brand-700">Note: {message}</p>}
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            <span className="flex-1">{message}</span>
            {photos.length > 0 && (
              <button type="button" className="inline-flex items-center gap-1 font-semibold underline" onClick={() => read(photos)}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Try again
              </button>
            )}
          </div>
        )}

        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </section>
  );
}

export default ScanPanel;
