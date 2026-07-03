"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Box, Stack, Fade } from "@mui/material";
import Webcam from "react-webcam";
import { useOcrProcessor, type ScannedCardData } from "@/lib/ocr";
import { useFaceScanner } from "@/lib/ocr/useFaceScanner";
import { ScannerUI } from "./ScannerUI";
import { CardPreview } from "./CardPreview";
import { ScannerInfoPanel } from "./ScannerInfoPanel";

type Phase = "detecting" | "processing" | "confirm";

interface StudentCardScannerProps {
  onScanned: (data: ScannedCardData) => void;
  onError?: (error: string) => void;
  onSkip?: () => void;
  videoSource?: "webcam" | "ipcamera";
  ipCameraUrl?: string;
}

export function StudentCardScanner({
  onScanned, onError, onSkip,
  videoSource = "webcam", ipCameraUrl,
}: StudentCardScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const ipCamRef = useRef<HTMLImageElement | null>(null);
  const [phase, setPhase] = useState<Phase>("detecting");
  const [ocrResult, setOcrResult] = useState<Partial<ScannedCardData> | null>(null);
  const [error, setError] = useState("");
  const autoDetectStarted = useRef(false);

  const { state: ocrState, runOcr } = useOcrProcessor(
    useCallback((msg: string) => {
      onError?.(msg);
      setError(msg);
    }, [onError]),
  );

  const handleCapture = useCallback(async (imageData: string): Promise<boolean> => {
    const parsed = await runOcr(imageData);
    if (parsed && parsed.studentCode && parsed.fullName) {
      setOcrResult(parsed);
      setPhase("confirm");
      return true;
    }
    return false;
  }, [runOcr]);

  const {
    cameraReady, setCameraReady,
    detectAttempts,
    startDetection, stopDetection,
  } = useFaceScanner({
    phase,
    onPhaseChange: setPhase,
    onCapture: handleCapture,
    onError: (msg) => setError(msg),
    videoSource,
    webcamRef,
    ipCamRef,
  });

  useEffect(() => {
    if (cameraReady && phase === "detecting" && !autoDetectStarted.current) {
      autoDetectStarted.current = true;
      startDetection();
    }
    return () => { stopDetection(); };
  }, [cameraReady, phase, startDetection, stopDetection]);

  const handleManualCapture = useCallback(async () => {
    stopDetection();
    setPhase("processing");
    setError("");

    let imageSrc: string | null = null;
    if (videoSource === "ipcamera") {
      const img = ipCamRef.current;
      if (img && img.complete) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        imageSrc = canvas.toDataURL("image/jpeg", 0.95);
      }
    } else {
      imageSrc = webcamRef.current?.getScreenshot() || null;
    }

    if (!imageSrc) {
      setError("Không thể chụp ảnh từ camera");
      setPhase("detecting");
      return;
    }
    const parsed = await runOcr(imageSrc);
    if (parsed && parsed.studentCode && parsed.fullName) {
      setOcrResult(parsed);
      setPhase("confirm");
    } else {
      setError("Không thể đọc thông tin từ thẻ. Hãy đảm bảo thẻ rõ nét và đủ ánh sáng.");
      setPhase("detecting");
    }
  }, [stopDetection, videoSource, runOcr]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopDetection();
    setPhase("processing");
    setError("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const parsed = await runOcr(dataUrl);
      if (parsed && parsed.studentCode && parsed.fullName) {
        setOcrResult(parsed);
        setPhase("confirm");
      } else {
        setError("Không thể đọc thông tin từ ảnh này");
        setPhase("detecting");
      }
    };
    reader.readAsDataURL(file);
  }, [stopDetection, runOcr]);

  const handleConfirm = () => {
    if (ocrResult) onScanned(ocrResult as ScannedCardData);
  };

  const handleRetake = () => {
    setOcrResult(null);
    setError("");
    setPhase("detecting");
    autoDetectStarted.current = false;
  };

  return (
    <Stack spacing={0}>
      {phase === "confirm" && ocrResult ? (
        <Fade in>
          <Box>
            <CardPreview
              data={ocrResult as ScannedCardData}
              onConfirm={handleConfirm}
              onRetake={handleRetake}
              onSkip={onSkip}
            />
          </Box>
        </Fade>
      ) : (
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 0, minHeight: { md: 420 } }}>
          <ScannerUI
            videoSource={videoSource}
            ipCameraUrl={ipCameraUrl}
            phase={phase}
            cameraReady={cameraReady}
            ocrLoading={ocrState.loading}
            ocrProgress={ocrState.progress}
            detectAttempts={detectAttempts}
            maxDetectAttempts={10}
            webcamRef={webcamRef}
            ipCamRef={ipCamRef}
            onCameraReady={() => setCameraReady(true)}
            onCameraError={(msg) => setError(msg)}
          />
          <ScannerInfoPanel
            phase={phase}
            ocrResult={ocrResult}
            error={error}
            cameraReady={cameraReady}
            processing={ocrState.loading}
            onCapture={handleManualCapture}
            onFileUpload={handleFileUpload}
            onSkip={onSkip}
          />
        </Box>
      )}
    </Stack>
  );
}
