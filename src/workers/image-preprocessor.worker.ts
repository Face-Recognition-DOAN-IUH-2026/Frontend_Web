/**
 * Image Preprocessing Web Worker
 * 
 * Handles image resizing, grayscale conversion, and WebP compression
 * off the main thread to prevent UI blocking.
 */

interface PreprocessMessage {
  image: Blob;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  convertToGrayscale?: boolean;
}

interface PreprocessResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  processedSize: number;
  brightness: number;
}

self.onmessage = async (e: MessageEvent<PreprocessMessage>) => {
  const {
    image,
    maxWidth = 640,
    maxHeight = 480,
    quality = 0.7,
    convertToGrayscale = true,
  } = e.data;

  try {
    const originalSize = image.size;
    
    const bitmap = await createImageBitmap(image);
    const canvas = new OffscreenCanvas(maxWidth, maxHeight);
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

    const blob = await canvas.convertToBlob({
      type: 'image/webp',
      quality,
    });

    const result: PreprocessResult = {
      blob,
      width: newWidth,
      height: newHeight,
      originalSize,
      processedSize: blob.size,
      brightness: avgBrightness,
    };

    self.postMessage(result);
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
