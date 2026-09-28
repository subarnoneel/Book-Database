import { loadLibraryMeta } from "./bookController.js";
import { scanBook } from "../services/bookScanner.js";
import { HttpError } from "../utils/httpError.js";

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST /api/scan  { images: [{ data: <base64>, mimeType }] }
// Returns the details read from the photos. Nothing is saved.
export const scan = async (req, res) => {
  const images = req.body?.images;
  if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGES) {
    throw new HttpError(400, `Send between 1 and ${MAX_IMAGES} photos.`);
  }
  for (const img of images) {
    if (typeof img?.data !== "string" || !MIME_TYPES.includes(img?.mimeType)) {
      throw new HttpError(400, "Photos must be JPEG, PNG or WebP.");
    }
    if (Buffer.byteLength(img.data, "base64") > MAX_IMAGE_BYTES) {
      throw new HttpError(413, "A photo is too large (max 5 MB).");
    }
  }

  const meta = await loadLibraryMeta();
  const result = await scanBook(images, {
    authors: meta.authors,
    publishers: meta.publishers,
    genres: meta.genres.map((g) => g.name),
  });
  res.json(result);
};
