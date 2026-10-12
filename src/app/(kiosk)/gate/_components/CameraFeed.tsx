"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  keyframes,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import LaptopOutlinedIcon from "@mui/icons-material/LaptopOutlined";
import CenterFocusWeakIcon from "@mui/icons-material/CenterFocusWeak";

interface CameraFeedProps {
  src: string;
  cameraId?: string;
  label: string;
  useWebcam?: boolean;
  onToggleWebcam?: () => void;
  overlay?: {
    bbox?: [number, number, number, number];
    landmarks?: [number, number][];
    status?: string;
  } | null;
  onStatusChange?: (ok: boolean) => void;
  onSpoofDetected?: (reason: string) => void;
}

const OVERLAY_COLORS: Record<string, string> = {
  granted: "#10b981",
  wrong_direction: "#f59e0b",
  expired: "#f97316",
  spoof: "#ef4444",
};

const laserScan = keyframes`
  0% {
    top: 5%;
    opacity: 0.8;
  }
  50% {
    top: 90%;
    opacity: 1;
  }
  100% {
    top: 5%;
    opacity: 0.8;
  }
`;

const pulseDot = keyframes`
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
`;

const ONLINE_INTERVAL = 1000;
const OFFLINE_INTERVAL = 5000;

let globalWebcamStream: MediaStream | null = null;
const globalWebcamListeners = new Set<(stream: MediaStream | null) => void>();
let globalWebcamPromise: Promise<MediaStream> | null = null;

async function getSharedWebcamStream(): Promise<MediaStream> {
  if (globalWebcamStream && globalWebcamStream.active) {
    return globalWebcamStream;
  }
  if (!globalWebcamPromise) {
    globalWebcamPromise = navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      })
      .then((stream) => {
        globalWebcamStream = stream;
        globalWebcamPromise = null;
        if (stream.getVideoTracks()[0]) {
          stream.getVideoTracks()[0].onended = () => {
            globalWebcamStream = null;
            globalWebcamListeners.forEach((fn) => fn(null));
          };
        }
        globalWebcamListeners.forEach((fn) => fn(stream));
        return stream;
      })
      .catch((err) => {
        globalWebcamPromise = null;
        throw err;
      });
  }
  return globalWebcamPromise;
}

function releaseSharedWebcamStream() {
  if (globalWebcamListeners.size === 0 && globalWebcamStream) {
    globalWebcamStream.getTracks().forEach((track) => track.stop());
    globalWebcamStream = null;
  }
}

export default function CameraFeed({
  src,
  cameraId,
  label,
  useWebcam = false,
  onToggleWebcam,
  overlay,
  onStatusChange,
  onSpoofDetected,
}: CameraFeedProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ts, setTs] = useState(() => Date.now());
  const [ok, setOk] = useState<boolean | null>(null);
  const [localSpoofReason, setLocalSpoofReason] = useState<string | null>(null);
  const lastUploadTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStream = src.includes("/video") || src.includes("/mjpeg");

  useEffect(() => {
    onStatusChange?.(ok === true);
  }, [ok, onStatusChange]);

  // Webcam stream lifecycle (shares 1 hardware stream across both Cổng vào and Cổng ra)
  useEffect(() => {
    if (!useWebcam) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      return;
    }

    let active = true;
    const listener = (stream: MediaStream | null) => {
      if (!active) return;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setOk(!!stream);
    };

    globalWebcamListeners.add(listener);

    getSharedWebcamStream()
      .then((stream) => {
        if (!active) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setOk(true);
      })
      .catch((err) => {
        console.error("[CameraFeed] Webcam access error:", err);
        setOk(false);
      });

    return () => {
      active = false;
      globalWebcamListeners.delete(listener);
      releaseSharedWebcamStream();
    };
  }, [useWebcam]);

  // Direct periodic webcam frame transmission for face recognition (1.5s interval)
  useEffect(() => {
    if (!useWebcam || !ok || !cameraId) return;

    let isMounted = true;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      const now = Date.now();
      if (now - lastUploadTimeRef.current < 1500) return;
      lastUploadTimeRef.current = now;

      try {
        const offscreen = document.createElement("canvas");
        offscreen.width = video.videoWidth || 640;
        offscreen.height = video.videoHeight || 480;
        const ctx = offscreen.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        offscreen.toBlob((blob) => {
          if (!blob || !isMounted) return;
          const formData = new FormData();
          formData.append("file", blob, "webcam_frame.jpg");
          fetch(`/api/camera/frame/${cameraId}`, {
            method: "POST",
            body: formData,
          }).catch(() => {
            // Ignore transient network errors
          });
        }, "image/jpeg", 0.9);
      } catch {
        // Ignore canvas extraction errors
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [useWebcam, ok, cameraId]);

  const snapshotUrl = cameraId
    ? `/api/camera/snapshot/${cameraId}`
    : src;

  const scheduleNext = useCallback((success: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isStream || useWebcam) return;
    timerRef.current = setTimeout(() => setTs(Date.now()), success ? ONLINE_INTERVAL : OFFLINE_INTERVAL);
  }, [isStream, useWebcam]);

  useEffect(() => {
    if (!cameraId || useWebcam) return;
    scheduleNext(true);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [cameraId, ts, scheduleNext, useWebcam]);

  // Overlay drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!overlay?.bbox && !overlay?.landmarks) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const mediaEl = useWebcam ? videoRef.current : imgRef.current;
    if (!mediaEl) return;

    const rect = mediaEl.getBoundingClientRect();
    const naturalW = useWebcam
      ? (mediaEl as HTMLVideoElement).videoWidth || 1
      : (mediaEl as HTMLImageElement).naturalWidth || 1;
    const naturalH = useWebcam
      ? (mediaEl as HTMLVideoElement).videoHeight || 1
      : (mediaEl as HTMLImageElement).naturalHeight || 1;

    const scaleX = rect.width / naturalW;
    const scaleY = rect.height / naturalH;

    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (overlay.bbox) {
      const [x1, y1, x2, y2] = overlay.bbox;
      ctx.strokeStyle = OVERLAY_COLORS[overlay.status || "granted"] || "#10b981";
      ctx.lineWidth = 3;
      ctx.strokeRect(x1 * scaleX, y1 * scaleY, (x2 - x1) * scaleX, (y2 - y1) * scaleY);
    }

    if (overlay.landmarks) {
      overlay.landmarks.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x * scaleX, y * scaleY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
      });
    }
  }, [overlay, useWebcam]);

  const isGranted = overlay?.status === "granted";
  const isDenied = overlay?.status === "spoof" || overlay?.status === "wrong_direction" || overlay?.status === "expired" || overlay?.status === "denied";
  const isSpoofing = Boolean(localSpoofReason || overlay?.status === "spoof");

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        height: "100%",
        borderRadius: 3,
        transition: "all 0.3s ease",
        borderColor: isGranted ? "#10b981" : isDenied ? "#ef4444" : "divider",
        borderWidth: isGranted || isDenied ? 2 : 1,
        boxShadow: isGranted
          ? "0 0 28px rgba(16, 185, 129, 0.4)"
          : isDenied
          ? "0 0 28px rgba(239, 68, 68, 0.4)"
          : "0 4px 20px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* Header bar */}
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.25,
          borderBottom: 1,
          borderColor: isGranted ? "#10b981" : isDenied ? "#ef4444" : "divider",
          bgcolor: isGranted
            ? "rgba(16, 185, 129, 0.1)"
            : isDenied
            ? "rgba(239, 68, 68, 0.1)"
            : "background.paper",
          transition: "all 0.3s ease",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {useWebcam ? (
            <LaptopOutlinedIcon
              sx={{
                color: isGranted ? "#10b981" : isDenied ? "#ef4444" : "primary.main",
                fontSize: 22,
              }}
            />
          ) : (
            <VideocamOutlinedIcon
              sx={{
                color: isGranted ? "#10b981" : isDenied ? "#ef4444" : "primary.main",
                fontSize: 22,
              }}
            />
          )}
          <Typography sx={{ fontWeight: 800, color: isGranted ? "#10b981" : isDenied ? "#ef4444" : "text.primary" }}>
            {label}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {onToggleWebcam && (
            <Button
              size="small"
              variant={useWebcam ? "contained" : "outlined"}
              color={useWebcam ? "info" : "inherit"}
              onClick={onToggleWebcam}
              startIcon={useWebcam ? <LaptopOutlinedIcon sx={{ fontSize: 16 }} /> : <VideocamOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{
                textTransform: "none",
                py: 0.2,
                px: 1,
                fontSize: "0.72rem",
                fontWeight: 700,
                borderRadius: 1.5,
              }}
            >
              {useWebcam ? "Webcam máy tính" : "IP Camera"}
            </Button>
          )}

          {isGranted && (
            <Chip
              size="small"
              color="success"
              label="HỢP LỆ — MỜI QUA"
              sx={{ fontWeight: 800, fontSize: "0.72rem" }}
            />
          )}
          {isDenied && (
            <Chip
              size="small"
              color="error"
              label="TỪ CHỐI"
              sx={{ fontWeight: 800, fontSize: "0.72rem" }}
            />
          )}
          <Chip
            size="small"
            color={ok === null ? "warning" : ok ? "success" : "error"}
            label={ok === null ? "Đang nối" : ok ? (useWebcam ? "Live Webcam" : "Live Stream") : "Mất tín hiệu"}
            variant="outlined"
            icon={
              ok ? (
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: "success.main",
                    animation: `${pulseDot} 1.5s infinite`,
                    ml: 0.5,
                  }}
                />
              ) : undefined
            }
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </Stack>

      {/* Video Viewport with Cyber Biometric HUD */}
      <Box sx={{ position: "relative", aspectRatio: "16 / 9", bgcolor: "#070B14", overflow: "hidden" }}>
        {useWebcam ? (
          <Box
            component="video"
            ref={videoRef}
            autoPlay
            playsInline
            muted
            sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        ) : (
          <Box
            component="img"
            ref={imgRef}
            src={isStream ? snapshotUrl : `${snapshotUrl}?_t=${ts}`}
            onLoad={() => { setOk(true); scheduleNext(true); }}
            onError={() => { setOk(false); scheduleNext(false); }}
            alt={label}
            sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        )}
        <Box component="canvas" ref={canvasRef} sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />



        {/* Cyber HUD Corner Brackets when active */}
        {ok && (
          <>
            {/* Top-Left Bracket */}
            <Box
              sx={{
                position: "absolute",
                top: 14,
                left: 14,
                width: 24,
                height: 24,
                borderTop: `3px solid ${isSpoofing ? "#ef4444" : "#10b981"}`,
                borderLeft: `3px solid ${isSpoofing ? "#ef4444" : "#10b981"}`,
                pointerEvents: "none",
                filter: `drop-shadow(0 0 6px ${isSpoofing ? "#ef4444" : "#10b981"})`,
              }}
            />
            {/* Top-Right Bracket */}
            <Box
              sx={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 24,
                height: 24,
                borderTop: `3px solid ${isSpoofing ? "#ef4444" : "#10b981"}`,
                borderRight: `3px solid ${isSpoofing ? "#ef4444" : "#10b981"}`,
                pointerEvents: "none",
                filter: `drop-shadow(0 0 6px ${isSpoofing ? "#ef4444" : "#10b981"})`,
              }}
            />
            {/* Bottom-Left Bracket */}
            <Box
              sx={{
                position: "absolute",
                bottom: 14,
                left: 14,
                width: 24,
                height: 24,
                borderBottom: `3px solid ${isSpoofing ? "#ef4444" : "#10b981"}`,
                borderLeft: `3px solid ${isSpoofing ? "#ef4444" : "#10b981"}`,
                pointerEvents: "none",
                filter: `drop-shadow(0 0 6px ${isSpoofing ? "#ef4444" : "#10b981"})`,
              }}
            />
            {/* Bottom-Right Bracket */}
            <Box
              sx={{
                position: "absolute",
                bottom: 14,
                right: 14,
                width: 24,
                height: 24,
                borderBottom: `3px solid ${isSpoofing ? "#ef4444" : "#10b981"}`,
                borderRight: `3px solid ${isSpoofing ? "#ef4444" : "#10b981"}`,
                pointerEvents: "none",
                filter: `drop-shadow(0 0 6px ${isSpoofing ? "#ef4444" : "#10b981"})`,
              }}
            />

            {/* Laser scanning sweep line */}
            <Box
              sx={{
                position: "absolute",
                left: "8%",
                right: "8%",
                height: "2px",
                background: "linear-gradient(90deg, transparent, #10b981, transparent)",
                boxShadow: "0 0 12px 2px rgba(16, 185, 129, 0.7)",
                animation: `${laserScan} 3s ease-in-out infinite`,
                pointerEvents: "none",
              }}
            />

            {/* Sub-HUD Badge */}
            <Box
              sx={{
                position: "absolute",
                bottom: 10,
                left: "50%",
                transform: "translateX(-50%)",
                bgcolor: "rgba(10, 37, 64, 0.75)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                px: 1.5,
                py: 0.35,
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                pointerEvents: "none",
              }}
            >
              <CenterFocusWeakIcon sx={{ fontSize: 13, color: "#10b981" }} />
              <Typography
                variant="caption"
                sx={{
                  color: "white",
                  fontSize: "0.68rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                AI BIOMETRIC GATEWAY
              </Typography>
            </Box>
          </>
        )}

        {/* Loading overlay */}
        {ok === null && (
          <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(7, 11, 20, 0.75)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1.5}>
            <CircularProgress size={32} sx={{ color: "primary.light" }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {useWebcam ? "Đang bật camera máy tính..." : "Đang kết nối luồng camera..."}
            </Typography>
          </Stack>
        )}

        {/* Offline overlay */}
        {ok === false && (
          <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(7, 11, 20, 0.85)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1.5}>
            {useWebcam ? (
              <>
                <LaptopOutlinedIcon sx={{ fontSize: 52, color: "error.light", opacity: 0.7 }} />
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                  Không thể truy cập camera máy tính — Vui lòng cấp quyền trình duyệt
                </Typography>
              </>
            ) : (
              <>
                <VideocamOutlinedIcon sx={{ fontSize: 52, color: "error.light", opacity: 0.7 }} />
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                  Camera ngoại tuyến — Kiểm tra kết nối
                </Typography>
              </>
            )}
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
