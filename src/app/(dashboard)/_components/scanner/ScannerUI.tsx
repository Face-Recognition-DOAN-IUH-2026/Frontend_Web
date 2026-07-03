"use client";

import React from "react";
import { Box, Typography, CircularProgress, LinearProgress, alpha } from "@mui/material";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import Webcam from "react-webcam";

type ScannerPhase = "detecting" | "processing" | "confirm";

interface ScannerUIProps {
  videoSource: "webcam" | "ipcamera";
  ipCameraUrl?: string;
  phase: ScannerPhase;
  cameraReady: boolean;
  ocrLoading: boolean;
  ocrProgress: number;
  detectAttempts: number;
  maxDetectAttempts: number;
  webcamRef: React.RefObject<Webcam | null>;
  ipCamRef: React.RefObject<HTMLImageElement | null>;
  onCameraReady: () => void;
  onCameraError: (msg: string) => void;
  videoConstraints?: MediaStreamConstraints["video"];
}

const STATUS_BG = "rgba(13, 17, 23, 0.85)";
const CORNER_BORDER = "3px";

export function ScannerUI({
  videoSource,
  ipCameraUrl,
  phase,
  cameraReady,
  ocrLoading,
  ocrProgress,
  detectAttempts,
  maxDetectAttempts,
  webcamRef,
  ipCamRef,
  onCameraReady,
  onCameraError,
  videoConstraints = {
    facingMode: "environment",
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
}: ScannerUIProps) {
  return (
    <Box
      sx={{
        flex: { md: "0 0 55%" },
        position: "relative",
        bgcolor: "common.black",
        borderRadius: { xs: "12px 12px 0 0", md: "12px 0 0 12px" },
        overflow: "hidden",
        minHeight: { xs: 280, md: 420 },
      }}
    >
      {videoSource === "ipcamera" ? (
        <Box
          component="img"
          ref={ipCamRef}
          src={ipCameraUrl}
          alt="IP Camera"
          onLoad={onCameraReady}
          onError={() => onCameraError("Không thể kết nối IP Camera")}
          sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      ) : (
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.9}
          videoConstraints={videoConstraints}
          onUserMedia={onCameraReady}
          onUserMediaError={() => onCameraError("Không thể truy cập camera")}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      )}

      <CardFrameOverlay />

      {phase !== "confirm" && (
        <StatusBadge
          phase={phase}
          detectAttempts={detectAttempts}
          maxDetectAttempts={maxDetectAttempts}
        />
      )}

      {!cameraReady && <NotReadyOverlay />}

      {phase === "processing" && ocrLoading && (
        <ProcessingOverlay ocrProgress={ocrProgress} />
      )}
    </Box>
  );
}

function CardFrameOverlay() {
  return (
    <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <Box sx={{ width: "70%", aspectRatio: "1.6 / 1", position: "relative" }}>
        {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((corner) => {
          const isTop = corner.includes("top");
          const isLeft = corner.includes("left");
          return (
            <Box
              key={corner}
              sx={{
                position: "absolute",
                width: 28,
                height: 28,
                [isTop ? "top" : "bottom"]: -2,
                [isLeft ? "left" : "right"]: -2,
                borderColor: "common.white",
                borderStyle: "solid",
                borderWidth: 0,
                [`border${isTop ? "Top" : "Bottom"}Width`]: CORNER_BORDER,
                [`border${isLeft ? "Left" : "Right"}Width`]: CORNER_BORDER,
                borderRadius: isTop && isLeft ? "12px 0 0 0"
                  : isTop && !isLeft ? "0 12px 0 0"
                  : !isTop && isLeft ? "0 0 0 12px"
                  : "0 0 12px 0",
                opacity: 0.9,
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}

function StatusBadge({ phase, detectAttempts, maxDetectAttempts }: {
  phase: ScannerPhase;
  detectAttempts: number;
  maxDetectAttempts: number;
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 1,
        bgcolor: STATUS_BG,
        px: 2,
        py: 1,
        borderRadius: 20,
        backdropFilter: "blur(4px)",
      }}
    >
      {phase === "detecting" && (
        <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "#7A8CA8", animation: "pulse-blue 2s ease-in-out infinite" }} />
      )}
      {phase === "processing" && (
        <HourglassBottomIcon sx={{ fontSize: 18, color: "#1A73E8", animation: "pulse-blue 1s ease-in-out infinite" }} />
      )}
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          color: "common.white",
          whiteSpace: { xs: "normal", sm: "nowrap" },
          fontSize: { xs: "0.7rem", sm: "0.875rem" },
        }}
      >
        {phase === "processing"
          ? `Đang nhận dạng... ${detectAttempts > 0 ? `(${detectAttempts}/${maxDetectAttempts})` : ""}`
          : phase === "detecting"
          ? "Đang phát hiện thẻ..."
          : "Đọc thẻ thành công"}
      </Typography>
    </Box>
  );
}

function NotReadyOverlay() {
  return (
    <Box
      sx={{
        position: "absolute", inset: 0,
        bgcolor: "rgba(0,0,0,0.6)",
        color: "common.white",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 1,
      }}
    >
      <CircularProgress size={28} color="inherit" />
      <Typography variant="body2">Đang kết nối camera...</Typography>
    </Box>
  );
}

function ProcessingOverlay({ ocrProgress }: { ocrProgress: number }) {
  return (
    <Box
      sx={{
        position: "absolute", inset: 0,
        bgcolor: "rgba(0,0,0,0.7)",
        color: "common.white",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 1,
      }}
    >
      <CircularProgress size={28} color="inherit" />
      <Typography variant="body2">Đang nhận dạng chữ viết...</Typography>
      <Box sx={{ width: 160 }}>
        <LinearProgress
          variant="determinate"
          value={Math.max(ocrProgress * 100, 5)}
          sx={{ borderRadius: 1, height: 4 }}
        />
        <Typography variant="caption" sx={{ mt: 0.5, display: "block", textAlign: "center" }}>
          {Math.round(ocrProgress * 100)}%
        </Typography>
      </Box>
    </Box>
  );
}
