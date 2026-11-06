"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  extractBookCodeFromOcr,
  normalizeLibBarcode,
  normalizeIsbn,
  looksLikeBookCode,
} from "../ocr/barcode-ocr";

interface UseBarcodeOCRState {
  status: "idle" | "loading" | "ready" | "error";
  progress: number;
  recognizedCode: string | null;
  codeType: "copy" | "isbn" | null;
  rawText: string | null;
  error: string | null;
}

interface UseBarcodeOCROptions {
  /** Ngôn ngữ OCR (vie+eng để nhận diện tốt chữ và số Việt Nam) */
  lang?: string[] | readonly string[];
  /** Whitelist ký tự để tăng tốc độ và độ chính xác */
  charWhitelist?: string;
  /** Callback khi nhận diện được mã sách */
  onRecognized?: (code: string, type: "copy" | "isbn") => void;
  /** Khoảng thời gian giữa các lần OCR (ms) */
  intervalMs?: number;
}

interface UseBarcodeOCRReturn {
  state: UseBarcodeOCRState;
  /** Chạy OCR trên một khung hình video (HTMLVideoElement) */
  runOcrOnVideo: (video: HTMLVideoElement) => Promise<{ type: "copy" | "isbn"; value: string } | null>;
  /** Chạy OCR trên một canvas (HTMLCanvasElement) */
  runOcrOnCanvas: (canvas: HTMLCanvasElement) => Promise<{ type: "copy" | "isbn"; value: string } | null>;
  /** Chạy OCR trên một Blob/url ảnh */
  runOcrOnImage: (imageSrc: string) => Promise<{ type: "copy" | "isbn"; value: string } | null>;
  /** Khởi tạo Tesseract worker (gọi một lần khi mount) */
  init: () => Promise<void>;
  /** Dừng worker */
  terminate: () => void;
}

/**
 * Hook OCR nhận diện mã sách từ camera web (Tesseract.js client-side).
 * Dùng làm phương án dự phòng khi bộ đọc mã vạch 1D không giải mã được.
 */
export function useBarcodeOCR(
  options: UseBarcodeOCROptions = {},
): UseBarcodeOCRReturn {
  const {
    charWhitelist = "LIB0123456789-",
    onRecognized,
    intervalMs = 1500,
  } = options;

  const [state, setState] = useState<UseBarcodeOCRState>({
    status: "idle",
    progress: 0,
    recognizedCode: null,
    codeType: null,
    rawText: null,
    error: null,
  });

  const workerRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const lastOcrTimeRef = useRef(0);
  const onRecognizedRef = useRef(onRecognized);
  onRecognizedRef.current = onRecognized;

  /**
   * `lang` thường là một mảng mới ở mỗi lần render (inline prop hoặc giá trị
   * mặc định của object options). Nếu dùng trực tiếp làm dependency của
   * useCallback, các callback trả về sẽ đổi identity mỗi lần render → effect
   * của consumer chạy lại vô hạn → React báo "Maximum update depth exceeded".
   * Vì vậy memo theo NỘI DUNG của mảng thay vì theo identity.
   */
  const langKey = Array.isArray(options.lang) ? options.lang.join("|") : "";
  const langArray = useMemo<string[]>(
    () => (Array.isArray(options.lang) ? [...options.lang] : ["vie", "eng"]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [langKey],
  );

  // ---- Khởi tạo Tesseract worker ----
  const init = useCallback(async (): Promise<void> => {
    if (initializedRef.current) return;
    setState((prev) => ({ ...prev, status: "loading", progress: 0 }));

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(...langArray);
      await worker.setParameters({
        tessedit_char_whitelist: charWhitelist,
        tessedit_pageseg_mode: 6 as any, // Assume a single uniform block of text
      });
      workerRef.current = worker;
      initializedRef.current = true;
      setState((prev) => ({ ...prev, status: "ready", progress: 100 }));
    } catch (err: any) {
      console.error("[BarcodeOCR] Init failed:", err);
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err.message || "Không thể khởi tạo OCR worker",
      }));
    }
  }, [langArray, charWhitelist]);

  // ---- Huỷ worker ----
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    initializedRef.current = false;
    setState((prev) => ({ ...prev, status: "idle", progress: 0 }));
  }, []);

  useEffect(() => {
    return () => {
      terminate();
    };
  }, [terminate]);

  // ---- Helper: vẽ frame video lên canvas, cắt ROI trung tâm ----
  const captureFrameToCanvas = useCallback(
    (video: HTMLVideoElement, canvas: HTMLCanvasElement): boolean => {
      if (video.readyState < 2) return false;

      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;

      // ROI: vùng trung tâm 60% chiều rộng, 50% chiều cao (tránh viền đen xung quanh tem)
      const roiW = Math.round(videoWidth * 0.6);
      const roiH = Math.round(videoHeight * 0.5);
      const roiX = Math.round((videoWidth - roiW) / 2);
      const roiY = Math.round((videoHeight - roiH) / 2);

      canvas.width = roiW;
      canvas.height = roiH;

      const ctx = canvas.getContext("2d");
      if (!ctx) return false;

      ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, roiW, roiH);
      return true;
    },
    [],
  );

  // ---- Helper: tiền xử lý ảnh canvas (grayscale + contrast) ----
  const preprocessCanvas = useCallback((canvas: HTMLCanvasElement): void => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Chuyển sang grayscale + tăng contrast đơn giản
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Contrast stretch: đen thành đen hơn, trắng thành trắng hơn
      const enhanced = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);
      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  // ---- Xử lý kết quả OCR ----
  const processOcrText = useCallback(
    (rawText: string): { type: "copy" | "isbn"; value: string } | null => {
      setState((prev) => ({ ...prev, rawText }));

      const result = extractBookCodeFromOcr(rawText);
      if (!result) return null;

      setState((prev) => ({
        ...prev,
        recognizedCode: result.value,
        codeType: result.type,
        status: "ready",
      }));

      onRecognizedRef.current?.(result.value, result.type);
      return result;
    },
    [],
  );

  // ---- Chạy OCR trên video element ----
  const runOcrOnVideo = useCallback(
    async (video: HTMLVideoElement): Promise<{ type: "copy" | "isbn"; value: string } | null> => {
      if (!initializedRef.current || !workerRef.current) {
        await init();
      }
      if (!workerRef.current) return null;

      const now = Date.now();
      if (now - lastOcrTimeRef.current < intervalMs) return null;
      lastOcrTimeRef.current = now;

      // Tạo canvas tạm thời
      const canvas = document.createElement("canvas");
      if (!captureFrameToCanvas(video, canvas)) return null;

      preprocessCanvas(canvas);

      setState((prev) => ({ ...prev, status: "loading", progress: 50 }));

      try {
        const { recognize: recognizeFn } = await import("tesseract.js");
        const { data } = await recognizeFn(canvas.toDataURL("image/jpeg", 0.85), ...langArray, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setState((prev) => ({ ...prev, progress: Math.min(90, m.progress * 100) }));
            }
          },
        });

        const result = processOcrText(data.text);
        setState((prev) => ({ ...prev, status: "ready", progress: 100 }));
        // Canvas tạm thời không được thêm vào DOM, không cần removeChild
        return result;
      } catch (err: any) {
        console.error("[BarcodeOCR] OCR failed:", err);
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err.message || "Lỗi chạy OCR",
        }));
        return null;
      }
    },
    [intervalMs, init, captureFrameToCanvas, preprocessCanvas, processOcrText, langArray],
  );

  // ---- Chạy OCR trên canvas ----
  const runOcrOnCanvas = useCallback(
    async (canvas: HTMLCanvasElement): Promise<{ type: "copy" | "isbn"; value: string } | null> => {
      if (!initializedRef.current || !workerRef.current) {
        await init();
      }
      if (!workerRef.current) return null;

      const now = Date.now();
      if (now - lastOcrTimeRef.current < intervalMs) return null;
      lastOcrTimeRef.current = now;

      preprocessCanvas(canvas);

      setState((prev) => ({ ...prev, status: "loading", progress: 50 }));

      try {
        const { recognize: recognizeFn } = await import("tesseract.js");
        const { data } = await recognizeFn(canvas.toDataURL("image/jpeg", 0.85), ...langArray, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setState((prev) => ({ ...prev, progress: Math.min(90, m.progress * 100) }));
            }
          },
        });

        const result = processOcrText(data.text);
        setState((prev) => ({ ...prev, status: "ready", progress: 100 }));
        return result;
      } catch (err: any) {
        console.error("[BarcodeOCR] OCR failed:", err);
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err.message || "Lỗi chạy OCR",
        }));
        return null;
      }
    },
    [intervalMs, init, preprocessCanvas, processOcrText, langArray],
  );

  // ---- Chạy OCR trên ảnh từ URL/base64 ----
  const runOcrOnImage = useCallback(
    async (imageSrc: string): Promise<{ type: "copy" | "isbn"; value: string } | null> => {
      if (!initializedRef.current || !workerRef.current) {
        await init();
      }
      if (!workerRef.current) return null;

      const now = Date.now();
      if (now - lastOcrTimeRef.current < intervalMs) return null;
      lastOcrTimeRef.current = now;

      setState((prev) => ({ ...prev, status: "loading", progress: 50 }));

      try {
        const { recognize: recognizeFn } = await import("tesseract.js");
        const { data } = await recognizeFn(imageSrc, ...langArray, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setState((prev) => ({ ...prev, progress: Math.min(90, m.progress * 100) }));
            }
          },
        });

        const result = processOcrText(data.text);
        setState((prev) => ({ ...prev, status: "ready", progress: 100 }));
        return result;
      } catch (err: any) {
        console.error("[BarcodeOCR] OCR failed:", err);
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err.message || "Lỗi chạy OCR",
        }));
        return null;
      }
    },
    [intervalMs, init, processOcrText, langArray],
  );

  return {
    state,
    runOcrOnVideo,
    runOcrOnCanvas,
    runOcrOnImage,
    init,
    terminate,
  };
}

export type { UseBarcodeOCRState, UseBarcodeOCROptions };
