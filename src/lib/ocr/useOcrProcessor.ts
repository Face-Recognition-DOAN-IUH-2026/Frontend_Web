"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { OcrWorker } from "./OcrWorker";
import { parseCardText, ScannedCardData } from "./parseCardText";

interface OcrProcessorState {
  progress: number;
  loading: boolean;
  workerAvailable: boolean;
}

interface UseOcrProcessorReturn {
  state: OcrProcessorState;
  runOcr: (imageData: string) => Promise<Partial<ScannedCardData> | null>;
  terminate: () => void;
}

/**
 * OCR processor that sends images to the backend for server-side Tesseract OCR.
 *
 * The frontend still does image preprocessing (Web Worker for grayscale + contrast)
 * to reduce bandwidth, but the actual OCR runs on the backend.
 *
 * This replaces the previous client-side Tesseract.js implementation that loaded
 * 20+ MB WASM and ran OCR in the browser.
 */
export function useOcrProcessor(
  onError?: (error: string) => void,
): UseOcrProcessorReturn {
  const [state, setState] = useState<OcrProcessorState>({
    progress: 0,
    loading: false,
    workerAvailable: true,
  });
  const preprocessWorkerRef = useRef<OcrWorker | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const preprocessor = new OcrWorker();
    preprocessWorkerRef.current = preprocessor;
    if (!preprocessor.isSupported) {
      setState((prev) => ({ ...prev, workerAvailable: false }));
    }

    return () => {
      preprocessor.terminate();
    };
  }, []);

  const runOcr = useCallback(async (
    imageData: string,
  ): Promise<Partial<ScannedCardData> | null> => {
    try {
      setState((prev) => ({ ...prev, progress: 0, loading: true }));

      // Step 1: Preprocess image via Web Worker (grayscale + contrast)
      const preprocessor = preprocessWorkerRef.current;
      let processed: string;
      if (preprocessor?.isSupported) {
        processed = await new Promise<string>((resolve) => {
          preprocessor.preprocess(imageData, {
            onResult: (data) => resolve(data),
            onError: () => resolve(imageData),
          });
        });
      } else {
        processed = imageData;
      }

      // Step 2: Extract base64 data from the processed data URL
      const base64Data = processed.includes(",")
        ? processed.split(",")[1]
        : processed;

      // Step 3: Send to backend OCR endpoint
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
      const token = typeof window !== "undefined"
        ? localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
        : undefined;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const ocrResponse = await fetch(`${API_BASE_URL}/api/face/ocr/process-card`, {
        method: "POST",
        headers,
        body: JSON.stringify({ image: base64Data }),
      });

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `OCR request failed: ${ocrResponse.status}`);
      }

      const ocrResult = await ocrResponse.json();
      setState((prev) => ({ ...prev, progress: 100 }));

      // Step 4: Parse the raw OCR text using LLM via backend
      if (!ocrResult.raw_text || ocrResult.raw_text.trim().length === 0) {
        setState((prev) => ({ ...prev, loading: false }));
        return null;
      }

      const parsed = await parseCardText(ocrResult.raw_text);
      setState((prev) => ({ ...prev, loading: false }));
      return parsed;
    } catch (err: any) {
      setState((prev) => ({ ...prev, loading: false }));
      onError?.("Lỗi OCR: " + (err.message || ""));
      return null;
    }
  }, [onError]);

  const terminate = useCallback(() => {
    preprocessWorkerRef.current?.terminate();
    preprocessWorkerRef.current = null;
  }, []);

  return { state, runOcr, terminate };
}
