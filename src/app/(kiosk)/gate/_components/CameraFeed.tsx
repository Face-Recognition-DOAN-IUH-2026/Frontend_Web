"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Spin from "antd/es/spin";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";

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
  granted: "#22c55e",
  wrong_direction: "#eab308",
  expired: "#f97316",
  spoof: "#ef4444",
};

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
      ctx.strokeStyle = OVERLAY_COLORS[overlay.status || "granted"] || "#22c55e";
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
        transition: "all 0.3s ease",
        borderColor: isGranted ? "#10b981" : isDenied ? "#ef4444" : "divider",
        borderWidth: isGranted || isDenied ? 2 : 1,
        boxShadow: isGranted
          ? "0 0 24px rgba(16, 185, 129, 0.4)"
          : isDenied
          ? "0 0 24px rgba(239, 68, 68, 0.4)"
          : "none",
      }}
    >
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
            ? "rgba(16, 185, 129, 0.08)"
            : isDenied
            ? "rgba(239, 68, 68, 0.08)"
            : "background.paper",
          transition: "all 0.3s ease",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <VideocamOutlinedIcon
            sx={{
              color: isGranted ? "#10b981" : isDenied ? "#ef4444" : "text.secondary",
              fontSize: 20,
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
            label={ok === null ? "Đang nối" : ok ? "Online" : "Mất tín hiệu"}
            variant="outlined"
          />
        </Stack>
      </Stack>

      <Box sx={{ position: "relative", aspectRatio: "16 / 9", bgcolor: "common.black" }}>
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
        {ok === null && (
          <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
            <Spin size="small" />
            <Typography variant="body2">Đang kết nối...</Typography>
          </Stack>
        )}
        {ok === false && (
          <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.70)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
            <VideocamOutlinedIcon sx={{ fontSize: 48, opacity: 0.4 }} />
            <Typography variant="body2" color="rgba(255,255,255,0.6)">Camera ngoại tuyến</Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
