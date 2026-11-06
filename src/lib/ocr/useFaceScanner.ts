"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";

type ScannerPhase = "detecting" | "processing" | "confirm";

const MAX_DETECT_ATTEMPTS = 10;
const DETECT_INTERVAL_MS = 4000;

interface UseFaceScannerOptions {
  phase: ScannerPhase;
  onPhaseChange: (phase: ScannerPhase) => void;
  onCapture: (imageData: string) => Promise<boolean>;
  onError?: (error: string) => void;
  videoSource?: "webcam" | "ipcamera";
  webcamRef: React.RefObject<Webcam | null>;
  ipCamRef: React.RefObject<HTMLImageElement | null>;
}

interface UseFaceScannerReturn {
  cameraReady: boolean;
  setCameraReady: (v: boolean) => void;
  detectAttempts: number;
  startDetection: () => void;
  stopDetection: () => void;
}

export function useFaceScanner({
  phase,
  onPhaseChange,
  onCapture,
  onError,
  videoSource = "webcam",
  webcamRef,
  ipCamRef,
}: UseFaceScannerOptions): UseFaceScannerReturn {
  const [cameraReady, setCameraReady] = useState(false);
  const [detectAttempts, setDetectAttempts] = useState(0);
  const isMounted = useRef(true);
  const phaseRef = useRef(phase);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Callbacks được giữ trong ref: nếu parent truyền arrow inline thì identity
   * của prop đổi mỗi lần render → attemptAutoDetect (và startDetection) đổi
   * identity theo → effect gọi startDetection chạy lại liên tục, camera quét
   * lại từ đầu. Ref giữ cho callback nội bộ luôn ổn định.
   */
  const onPhaseChangeRef = useRef(onPhaseChange);
  const onCaptureRef = useRef(onCapture);
  const onErrorRef = useRef(onError);
  onPhaseChangeRef.current = onPhaseChange;
  onCaptureRef.current = onCapture;
  onErrorRef.current = onError;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const stopDetection = useCallback(() => {
    if (detectTimerRef.current) {
      clearTimeout(detectTimerRef.current);
      detectTimerRef.current = null;
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (videoSource === "ipcamera") {
      const img = ipCamRef.current;
      if (!img || !img.complete || img.naturalWidth === 0) return null;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.95);
    }
    return webcamRef.current?.getScreenshot() || null;
  }, [videoSource, webcamRef, ipCamRef]);

  const checkImageHasContent = useCallback((dataUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const w = Math.min(img.width, 320);
        const h = Math.round((w / img.width) * img.height);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(true); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let sum = 0;
        let min = 255;
        let max = 0;
        for (let i = 0; i < data.length; i += 16) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sum += gray;
          if (gray < min) min = gray;
          if (gray > max) max = gray;
        }
        const pixels = data.length / 16;
        const avg = sum / pixels;
        const contrast = max - min;
        resolve(contrast > 30 && avg > 20 && avg < 240);
      };
      img.onerror = () => resolve(true);
      img.src = dataUrl;
    });
  }, []);

  const attemptAutoDetect = useCallback(async () => {
    if (!isMounted.current || phaseRef.current !== "detecting") return;

    const imageSrc = captureFrame();
    if (!imageSrc) {
      if (isMounted.current && phaseRef.current === "detecting") {
        detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
      }
      return;
    }

    setDetectAttempts((prev) => {
      const next = prev + 1;
      if (next >= MAX_DETECT_ATTEMPTS && isMounted.current) {
        onErrorRef.current?.("Không thể phát hiện thẻ sau nhiều lần thử. Hãy chụp thủ công hoặc tải ảnh.");
      }
      return next;
    });

    const hasContent = await checkImageHasContent(imageSrc);
    if (!hasContent) {
      if (isMounted.current && phaseRef.current === "detecting") {
        detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
      }
      return;
    }

    onPhaseChangeRef.current("processing");
    const success = await onCaptureRef.current(imageSrc);

    if (!isMounted.current) return;

    if (success) return;

    onPhaseChangeRef.current("detecting");

    if (isMounted.current && phaseRef.current === "detecting") {
      detectTimerRef.current = setTimeout(attemptAutoDetect, DETECT_INTERVAL_MS);
    }
  }, [captureFrame, checkImageHasContent]);

  const startDetection = useCallback(() => {
    stopDetection();
    setDetectAttempts(0);
    detectTimerRef.current = setTimeout(attemptAutoDetect, 1000);
  }, [stopDetection, attemptAutoDetect]);

  useEffect(() => {
    return () => {
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    };
  }, []);

  return {
    cameraReady,
    setCameraReady,
    detectAttempts,
    startDetection,
    stopDetection,
  };
}
