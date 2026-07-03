/**
 * Image Preprocessing Utility
 * 
 * Uses Web Worker for off-main-thread image processing.
 * Falls back to canvas-based processing if Web Worker is not available.
 */

interface PreprocessResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  processedSize: number;
  brightness: number;
}

interface PreprocessOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  convertToGrayscale?: boolean;
  brightnessThreshold?: number;
}

const DEFAULT_OPTIONS: PreprocessOptions = {
  maxWidth: 640,
  maxHeight: 480,
  quality: 0.7,
  convertToGrayscale: true,
  brightnessThreshold: 50,
};

let worker: Worker | null = null;
let workerSupported = typeof Worker !== 'undefined';

function getWorker(): Worker | null {
  if (!workerSupported) return null;
  
  if (!worker) {
    try {
      worker = new Worker(
        new URL('../workers/image-preprocessor.worker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch {
      workerSupported = false;
      return null;
    }
  }
  
  return worker;
}

async function preprocessWithWorker(
  image: Blob,
  options: PreprocessOptions
): Promise<PreprocessResult> {
  const worker = getWorker();
  
  if (!worker) {
    return fallbackPreprocess(image, options);
  }
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Web Worker timeout'));
    }, 5000);
    
    const handler = (e: MessageEvent) => {
      clearTimeout(timeout);
      worker!.removeEventListener('message', handler);
      
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data);
      }
    };
    
    worker.addEventListener('message', handler);
    worker.postMessage({
      image,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      quality: options.quality,
      convertToGrayscale: options.convertToGrayscale,
    });
  });
}

async function fallbackPreprocess(
  image: Blob,
  options: PreprocessOptions
): Promise<PreprocessResult> {
  const {
    maxWidth = 640,
    maxHeight = 480,
    quality = 0.7,
    convertToGrayscale = true,
  } = options;

  const bitmap = await createImageBitmap(image);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
  const newWidth = Math.round(bitmap.width * scale);
  const newHeight = Math.round(bitmap.height * scale);
  
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
  const data = imageData.data;

  let totalBrightness = 0;
  const pixelCount = newWidth * newHeight;

  if (convertToGrayscale) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      totalBrightness += gray;
      
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  } else {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  const avgBrightness = totalBrightness / pixelCount;

  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => resolve(b!),
      'image/webp',
      quality
    );
  });

  return {
    blob,
    width: newWidth,
    height: newHeight,
    originalSize: image.size,
    processedSize: blob.size,
    brightness: avgBrightness,
  };
}

export async function preprocessImage(
  file: File,
  options: PreprocessOptions = {}
): Promise<PreprocessResult> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  
  try {
    return await preprocessWithWorker(blob, mergedOptions);
  } catch {
    return fallbackPreprocess(blob, mergedOptions);
  }
}

export function isImageTooDark(brightness: number, threshold: number = 50): boolean {
  return brightness < threshold;
}

export function getImageSizeReduction(original: number, processed: number): number {
  return Math.round((1 - processed / original) * 100);
}
