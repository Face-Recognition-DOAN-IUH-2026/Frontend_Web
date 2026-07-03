const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

export interface DownscaleOptions {
  maxDimension?: number;
  quality?: number;
}

export async function downscaleImage(
  file: File,
  options: DownscaleOptions = {},
): Promise<Blob> {
  const { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = options;

  const img = await loadImage(file);
  const { width, height } = computeDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxDimension,
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas 2D context');

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function downscaleImageToFile(
  file: File,
  options: DownscaleOptions = {},
): Promise<File> {
  const blob = await downscaleImage(file, options);
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function computeDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number,
): { width: number; height: number } {
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }
  const ratio = Math.min(maxDimension / originalWidth, maxDimension / originalHeight);
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}
