"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, IconButton, Stack, Typography } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";

interface Props {
  cameraUrl: string;
  onBarcodeDetected: (barcode: string) => void;
  onError?: (error: string) => void;
}

export default function IPCameraStream({ cameraUrl, onBarcodeDetected, onError }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [streamKey, setStreamKey] = useState(0);
  const [imgReady, setImgReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const lastScannedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopReader = useCallback(() => {
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {}
      readerRef.current = null;
    }
  }, []);

  const handleReconnect = useCallback(() => {
    stopScanning();
    setCameraError("");
    setImgReady(false);
    setStreamKey((k) => k + 1);
  }, [stopScanning]);

  const handleScan = useCallback((code: string) => {
    const normalized = code.replace(/-/g, "");
    if (!/^\d{10,13}$/.test(normalized)) return;
    if (normalized === lastScannedRef.current) return;
    lastScannedRef.current = normalized;
    onBarcodeDetected(normalized);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastScannedRef.current = null;
    }, 2000);
  }, [onBarcodeDetected]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!active) return;
        readerRef.current = new BrowserMultiFormatReader();
      } catch (err) {
        console.error("Failed to load ZXing:", err);
      }
    })();
    return () => { active = false; stopReader(); };
  }, []);

  useEffect(() => {
    if (!imgReady || !imgRef.current || !canvasRef.current) return;
    stopScanning();

    intervalRef.current = setInterval(async () => {
      if (!imgRef.current || !canvasRef.current) return;
      if (!readerRef.current) return;
      const img = imgRef.current;
      const canvas = canvasRef.current;
      if (!img.complete) return;

      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return;

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        const result = await readerRef.current.decodeFromCanvas(canvas);
        if (result) {
          handleScan(result.getText());
        }
      } catch {}
    }, 500);

    return () => stopScanning();
  }, [imgReady, handleScan, stopScanning]);

  const handleImgLoad = () => {
    setCameraError("");
    setImgReady(true);
  };

  const handleImgError = () => {
    const errorMsg = "Không thể kết nối IP Camera. Vui lòng kiểm tra URL.";
    setCameraError(errorMsg);
    onError?.(errorMsg);
  };

  return (
    <Box sx={{ position: "relative", width: "100%", aspectRatio: "4/3", bgcolor: "black", borderRadius: 1, overflow: "hidden" }}>
      {cameraError ? (
        <Stack spacing={1.5} sx={{ alignItems: "center", justifyContent: "center", height: "100%", color: "grey.300", p: 3 }}>
          <CameraAltIcon sx={{ fontSize: 48 }} />
          <Typography sx={{ textAlign: "center" }}>{cameraError}</Typography>
          <Typography variant="caption" sx={{ color: "grey.500" }}>URL: {cameraUrl}</Typography>
          <Button variant="outlined" color="inherit" startIcon={<RefreshIcon />} onClick={handleReconnect}>
            Kết nối lại
          </Button>
        </Stack>
      ) : (
        <>
          <Box
            component="img"
            ref={imgRef}
            src={`${cameraUrl}${cameraUrl.includes("?") ? "&" : "?"}_t=${streamKey}`}
            onLoad={handleImgLoad}
            onError={handleImgError}
            alt="IP Camera Stream"
            sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {!imgReady && (
            <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
              <CircularProgress size={28} color="inherit" />
              <Typography variant="body2">Đang kết nối camera...</Typography>
            </Stack>
          )}
          {imgReady && (
            <IconButton
              onClick={handleReconnect}
              size="small"
              sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(0,0,0,.55)", color: "common.white", "&:hover": { bgcolor: "rgba(0,0,0,.75)" } }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          )}
          <Box sx={{ position: "absolute", top: 8, left: 8, px: 1, py: 0.5, bgcolor: "rgba(0,0,0,.6)", borderRadius: 0.5 }}>
            <Typography variant="caption" sx={{ color: "common.white", fontSize: 11 }}>IP Camera</Typography>
          </Box>
        </>
      )}
    </Box>
  );
}
