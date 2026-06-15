"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";

interface CameraFeedProps {
  src: string;
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

export default function CameraFeed({ src, label, overlay, onStatusChange }: CameraFeedProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ts] = useState(() => Date.now());
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    onStatusChange?.(ok === true);
  }, [ok, onStatusChange]);

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

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden", height: "100%" }}>
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <VideocamOutlinedIcon color="disabled" fontSize="small" />
          <Typography sx={{ fontWeight: 800 }}>{label}</Typography>
        </Stack>
        <Chip
          size="small"
          color={ok === null ? "warning" : ok ? "success" : "error"}
          label={ok === null ? "Đang nối" : ok ? "Online" : "Mất tín hiệu"}
        />
      </Stack>

      <Box sx={{ position: "relative", aspectRatio: "16 / 9", bgcolor: "common.black" }}>
        <Box
          component="img"
          ref={imgRef}
          src={`${src}?_t=${ts}`}
          onLoad={() => setOk(true)}
          onError={() => setOk(false)}
          alt={label}
          sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
        <Box component="canvas" ref={canvasRef} sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
        {ok === null && (
          <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
            <CircularProgress color="inherit" size={28} />
            <Typography variant="body2">Đang kết nối...</Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
