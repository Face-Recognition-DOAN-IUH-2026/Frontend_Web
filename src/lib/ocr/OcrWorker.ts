type OcrWorkerStatus = "idle" | "processing" | "done" | "error";

interface OcrWorkerCallbacks {
  onProgress?: (pct: number) => void;
  onResult?: (preprocessed: string) => void;
  onError?: (err: string) => void;
}

const WORKER_CODE = `
self.addEventListener("message", async (e) => {
  const { imageData } = e.data;
  try {
    const response = await fetch(imageData);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    
    const w = Math.min(imageBitmap.width, 1920);
    const scale = w / imageBitmap.width;
    const canvas = new OffscreenCanvas(w, Math.round(imageBitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      imageBitmap.close();
      self.postMessage({ type: "done", data: imageData });
      return;
    }
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
    imageBitmap.close();
    
    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageDataObj.data;
    const weights = [0.299, 0.587, 0.114];
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += weights[0] * data[i] + weights[1] * data[i + 1] + weights[2] * data[i + 2];
    }
    const avgBrightness = sum / (data.length / 4);
    const factor = avgBrightness > 180 ? 1.3 : avgBrightness < 80 ? 1.5 : 1.1;
    for (let i = 0; i < data.length; i += 4) {
      const gray = weights[0] * data[i] + weights[1] * data[i + 1] + weights[2] * data[i + 2];
      const enhanced = Math.min(255, Math.max(0, Math.round((gray - 128) * factor + 128)));
      data[i] = enhanced; data[i + 1] = enhanced; data[i + 2] = enhanced;
    }
    ctx.putImageData(imageDataObj, 0, 0);
    canvas.convertToBlob({ type: "image/jpeg", quality: 0.95 }).then((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => self.postMessage({ type: "done", data: reader.result });
      reader.onerror = () => self.postMessage({ type: "done", data: imageData });
      reader.readAsDataURL(blob);
    });
  } catch {
    self.postMessage({ type: "done", data: imageData });
  }
});
`;

function createWorkerBlob(): Worker | null {
  try {
    const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(blob));
  } catch {
    return null;
  }
}

export class OcrWorker {
  private worker: Worker | null = null;
  private status: OcrWorkerStatus = "idle";
  private callbacks: OcrWorkerCallbacks = {};

  constructor() {
    this.worker = createWorkerBlob();
    if (this.worker) {
      this.worker.addEventListener("message", (e) => {
        const { type, data } = e.data;
        if (type === "done") {
          this.status = "done";
          this.callbacks.onResult?.(data);
        }
      });
      this.worker.addEventListener("error", () => {
        this.status = "error";
        this.callbacks.onError?.("Worker error");
      });
    }
  }

  get isSupported(): boolean {
    return this.worker !== null;
  }

  get currentStatus(): OcrWorkerStatus {
    return this.status;
  }

  preprocess(imageData: string, cb: OcrWorkerCallbacks): void {
    this.status = "processing";
    this.callbacks = cb;
    if (this.worker) {
      this.worker.postMessage({ imageData });
    } else {
      cb.onError?.("Worker not available");
    }
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.status = "idle";
  }
}
