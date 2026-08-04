/** Compress/resize an image in the browser before upload (helps Vercel body limits). */
export async function prepareImageForUpload(
  file: File,
  options?: { maxEdge?: number; maxBytes?: number; quality?: number }
): Promise<File> {
  const maxEdge = options?.maxEdge ?? 2000;
  const maxBytes = options?.maxBytes ?? 3.5 * 1024 * 1024;
  const quality = options?.quality ?? 0.82;

  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  if (file.size <= maxBytes) {
    // Still downscale very large dimensions for reliability
    const dims = await readImageDims(file);
    if (!dims || (dims.width <= maxEdge && dims.height <= maxEdge)) {
      return file;
    }
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let q = quality;
  let blob: Blob | null = await canvasToBlob(canvas, "image/jpeg", q);
  while (blob && blob.size > maxBytes && q > 0.5) {
    q -= 0.1;
    blob = await canvasToBlob(canvas, "image/jpeg", q);
  }

  if (!blob) return file;

  const name = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

function readImageDims(file: File): Promise<{ width: number; height: number } | null> {
  return createImageBitmap(file)
    .then((bmp) => {
      const dims = { width: bmp.width, height: bmp.height };
      bmp.close();
      return dims;
    })
    .catch(() => null);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
