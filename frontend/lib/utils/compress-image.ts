/**
 * Client-side image compression for uploads.
 *
 * Downscales a photo so its longest side fits `maxDimension` and re-encodes
 * it as JPEG, cutting multi-megabyte phone photos to a few hundred KB before
 * they are sent. Compression is best-effort: non-images (e.g. PDF proofs),
 * GIF/SVG, and any decode/encode failure return the original file, and so
 * does a result that is not actually smaller — an upload is never blocked
 * or made worse by this step.
 */

export interface CompressImageOptions {
  /** Longest side of the output, in pixels. */
  maxDimension?: number;
  /** JPEG quality, 0–1. */
  quality?: number;
}

/** Presets per upload kind: ID/proof documents keep more pixels so small print stays legible. */
export const IMAGE_COMPRESSION = {
  photo: { maxDimension: 1600, quality: 0.8 },
  avatar: { maxDimension: 800, quality: 0.85 },
  document: { maxDimension: 2000, quality: 0.85 },
} as const satisfies Record<string, CompressImageOptions>;

const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export async function compressImage(file: File, options: CompressImageOptions = IMAGE_COMPRESSION.photo): Promise<File> {
  if (typeof document === 'undefined' || !COMPRESSIBLE_TYPES.has(file.type)) return file;
  const { maxDimension = 1600, quality = 0.8 } = options;

  let bitmap: ImageBitmap | null = null;
  try {
    // 'from-image' applies the EXIF rotation, so portrait phone photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    // JPEG has no alpha: paint transparent PNG/WebP areas white, not black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^./\\]+$/, '') || 'image'}.jpg`;
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

export function compressImages(files: File[], options?: CompressImageOptions): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}
