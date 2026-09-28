const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.85;

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

// Shrinks a phone photo (often 4000px+, several MB) to at most 1600px JPEG before
// upload. That is plenty for reading a cover and keeps scans fast and cheap.
// Rotation from the camera's EXIF data is applied.
export async function prepareImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This photo format isn't supported here. Please use a JPEG or PNG photo.");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  const data = await blobToBase64(blob);
  // A data: URL (not blob:) so the preview is allowed by the site's Content Security Policy.
  return { data, mimeType: "image/jpeg", previewUrl: `data:image/jpeg;base64,${data}` };
}
