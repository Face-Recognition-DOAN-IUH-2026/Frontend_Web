"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  keyframes,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import CenterFocusWeakIcon from "@mui/icons-material/CenterFocusWeak";

interface CameraFeedProps {
  src: string;
  cameraId?: string;
  label: string;
  overlay?: {
    bbox?: [number, number, number, number];
    landmarks?: [number, number][];
    status?: string;
  } | null;
  onStatusChange?: (ok: boolean) => void;
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

export default function CameraFeed({ src, cameraId, label, overlay, onStatusChange }: CameraFeedProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ts, setTs] = useState(() => Date.now());
  const [ok, setOk] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStream = src.includes("/video") || src.includes("/mjpeg");

  useEffect(() => {
    onStatusChange?.(ok === true);
  }, [ok, onStatusChange]);

  const snapshotUrl = cameraId
    ? `/api/camera/snapshot/${cameraId}`
    : src;

  const scheduleNext = useCallback((success: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isStream) return;
    timerRef.current = setTimeout(() => setTs(Date.now()), success ? ONLINE_INTERVAL : OFFLINE_INTERVAL);
  }, [isStream]);

  useEffect(() => {
    if (!cameraId) return;
    scheduleNext(true);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [cameraId, ts, scheduleNext]);

  useEffect(() => {
    if (!overlay?.bbox && !overlay?.landmarks) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const rect = img.getBoundingClientRect();
    const scaleX = rect.width / (img.naturalWidth || 1);
    const scaleY = rect.height / (img.naturalHeight || 1);

    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
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
  }, [overlay]);

  const isGranted = overlay?.status === "granted";
  const isDenied = overlay?.status === "spoof" || overlay?.status === "wrong_direction" || overlay?.status === "expired" || overlay?.status === "denied";

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
          <VideocamOutlinedIcon
            sx={{
              color: isGranted ? "#10b981" : isDenied ? "#ef4444" : "primary.main",
              fontSize: 22,
            }}
          />
          <Typography sx={{ fontWeight: 800, color: isGranted ? "#10b981" : isDenied ? "#ef4444" : "text.primary" }}>
            {label}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
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
            label={ok === null ? "Đang nối" : ok ? "Live Stream" : "Mất tín hiệu"}
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
        <Box
          component="img"
          ref={imgRef}
          src={isStream ? snapshotUrl : `${snapshotUrl}?_t=${ts}`}
          onLoad={() => { setOk(true); scheduleNext(true); }}
          onError={() => { setOk(false); scheduleNext(false); }}
          alt={label}
          sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
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
                borderTop: "3px solid #10b981",
                borderLeft: "3px solid #10b981",
                pointerEvents: "none",
                filter: "drop-shadow(0 0 6px #10b981)",
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
                borderTop: "3px solid #10b981",
                borderRight: "3px solid #10b981",
                pointerEvents: "none",
                filter: "drop-shadow(0 0 6px #10b981)",
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
                borderBottom: "3px solid #10b981",
                borderLeft: "3px solid #10b981",
                pointerEvents: "none",
                filter: "drop-shadow(0 0 6px #10b981)",
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
                borderBottom: "3px solid #10b981",
                borderRight: "3px solid #10b981",
                pointerEvents: "none",
                filter: "drop-shadow(0 0 6px #10b981)",
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
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Đang kết nối luồng camera...</Typography>
          </Stack>
        )}

        {/* Offline overlay */}
        {ok === false && (
          <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(7, 11, 20, 0.85)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1.5}>
            <VideocamOutlinedIcon sx={{ fontSize: 52, color: "error.light", opacity: 0.7 }} />
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Camera ngoại tuyến — Kiểm tra kết nối</Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
