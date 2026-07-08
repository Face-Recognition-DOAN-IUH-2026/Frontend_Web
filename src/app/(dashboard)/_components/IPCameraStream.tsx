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

const POLL_INTERVAL = 150;
const DEBOUNCE_MS = 1200;

export default function IPCameraStream({ cameraUrl, onBarcodeDetected, onError }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const readerRef = useRef<any>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [imgReady, setImgReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const lastScannedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    loadingRef.current = false;
  }, []);

  const stopReader = useCallback(() => {
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {}
      readerRef.current = null;
    }
  }, []);

  const loadNextFrame = useCallback(() => {
    if (!imgRef.current || loadingRef.current) return;
    loadingRef.current = true;
    const sep = cameraUrl.includes("?") ? "&" : "?";
    imgRef.current.src = `${cameraUrl}${sep}_t=${Date.now()}`;
  }, [cameraUrl]);

  const handleReconnect = useCallback(() => {
    stopPolling();
    setCameraError("");
    setImgReady(false);
    loadNextFrame();
  }, [loadNextFrame, stopPolling]);

  const handleScan = useCallback((code: string) => {
    const normalized = code.trim();
    if (normalized.length < 4) return;
    if (normalized === lastScannedRef.current) return;
    lastScannedRef.current = normalized;
    onBarcodeDetected(normalized);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastScannedRef.current = null;
    }, DEBOUNCE_MS);
  }, [onBarcodeDetected]);

  const scanCurrentFrame = useCallback(async () => {
    if (!imgRef.current || !readerRef.current) return;
    const img = imgRef.current;
    if (!img.complete || !(img.naturalWidth || img.width)) return;

    try {
      const result = await readerRef.current.decodeFromImageElement(img);
      if (result) {
        handleScan(result.getText());
      }
    } catch {}
  }, [handleScan]);

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
    loadNextFrame();
  }, [loadNextFrame]);

  useEffect(() => {
    scanTimerRef.current = setInterval(() => {
      scanCurrentFrame();
    }, 100);
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [scanCurrentFrame]);

  const handleImgLoad = useCallback(() => {
    loadingRef.current = false;
    setCameraError("");
    setImgReady(true);

    scanCurrentFrame();

    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(loadNextFrame, POLL_INTERVAL);
  }, [loadNextFrame, scanCurrentFrame]);

  const handleImgError = useCallback(() => {
    loadingRef.current = false;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(loadNextFrame, 300);
  }, [loadNextFrame]);

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
            onLoad={handleImgLoad}
            onError={handleImgError}
            alt="IP Camera Stream"
            sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
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
