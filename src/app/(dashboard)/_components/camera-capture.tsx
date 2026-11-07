"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import CameraswitchOutlinedIcon from "@mui/icons-material/CameraswitchOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import CameraFallback from "@/app/_components/CameraFallback";

export interface CameraCaptureProps {
  onCapture: (file: File, dataUrl: string) => void;
  showManualFallback?: boolean;
  manualLabel?: string;
  manualPlaceholder?: string;
  onManualSubmit?: (value: string) => void;
  onFileUpload?: (file: File) => void;
  overlayGuide?: "face" | "none";
  onClear?: () => void;
  title?: string;
}

export default function CameraCapture({
  onCapture,
  showManualFallback,
  manualLabel,
  manualPlaceholder,
  onManualSubmit,
  onFileUpload,
  overlayGuide = "face",
  onClear,
  title,
}: CameraCaptureProps) {
  const theme = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState<string>("");
  const [cameraReady, setCameraReady] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameCaptureRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFrameRef = useRef<string | null>(null);
  const hasCameraWorkedRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (frameCaptureRef.current) {
      clearInterval(frameCaptureRef.current);
      frameCaptureRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setShowFallback(false);
      setCameraReady(false);
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640, min: 320 }, height: { ideal: 480, min: 240 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setError("Không có quyền truy cập camera. Hãy cấp quyền camera cho trình duyệt rồi thử lại.");
      else if (err.name === "NotFoundError") setError("Không tìm thấy camera trên thiết bị.");
      else setError("Không thể khởi động camera.");
      setIsCameraOn(false);
      setShowFallback(true);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const onReady = () => {
      setCameraReady(true);
      hasCameraWorkedRef.current = true;
    };
    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = () => {
      setError("Camera gặp lỗi khi phát hình.");
      setShowFallback(true);
    };
    video.srcObject = streamRef.current;
    if (video.readyState >= 2) {
      onReady();
      hasCameraWorkedRef.current = true;
    }
    readyTimeoutRef.current = setTimeout(() => {
      setCameraReady(true);
      hasCameraWorkedRef.current = true;
    }, 3000);
    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
      video.srcObject = null;
    };
  }, [isCameraOn]);

  useEffect(() => {
    if (!isCameraOn || !cameraReady || !videoRef.current) return;
    frameCaptureRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || !streamRef.current) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        lastFrameRef.current = canvas.toDataURL("image/jpeg", 0.3);
      } catch {
        lastFrameRef.current = null;
      }
    }, 2000);
    return () => {
      if (frameCaptureRef.current) clearInterval(frameCaptureRef.current);
    };
  }, [isCameraOn, cameraReady]);

  const capturePhoto = () => {
    if (!videoRef.current || !cameraReady || videoRef.current.videoWidth === 0) {
      setError("Camera chưa sẵn sàng, vui lòng đợi thêm một chút.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Không thể chụp ảnh từ camera.");
      return;
    }
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
      const dataUrl = canvas.toDataURL("image/jpeg");
      setImage(dataUrl);
      setImageName("Ảnh chụp từ camera");
      onCapture(capturedFile, dataUrl);
      stopCamera();
    }, "image/jpeg", 0.9);
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn định dạng ảnh hợp lệ (JPG, PNG, WEBP).");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImage(dataUrl);
      setImageName(file.name);
      onCapture(file, dataUrl);
      onFileUpload?.(file);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const reset = () => {
    setImage(null);
    setImageName("");
    setError("");
    setShowFallback(false);
    stopCamera();
    onClear?.();
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <Stack spacing={1.5} sx={{ width: "100%" }}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
        }}
      />

      <Paper
        variant="outlined"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 3,
          bgcolor: theme.palette.mode === "dark" ? "#0A0E17" : "#0F172A",
          borderColor: isDragging ? "primary.main" : "divider",
          borderWidth: isDragging ? 2 : 1,
          borderStyle: isDragging ? "dashed" : "solid",
          aspectRatio: { xs: "4 / 3", sm: "16 / 10" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease-in-out",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        {image ? (
          <Box sx={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box
              component="img"
              src={image}
              alt="Ảnh đã chọn"
              sx={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            {/* Success Overlay Badge */}
            <Box
              sx={{
                position: "absolute",
                top: 12,
                left: 12,
                bgcolor: "rgba(16, 185, 129, 0.9)",
                backdropFilter: "blur(6px)",
                color: "#fff",
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {imageName || "Ảnh đã sẵn sàng"}
              </Typography>
            </Box>
          </Box>
        ) : showFallback ? (
          <CameraFallback
            lastFrameUrl={hasCameraWorkedRef.current ? lastFrameRef.current : null}
            onRetry={startCamera}
            showManualInput={showManualFallback}
            manualLabel={manualLabel}
            manualPlaceholder={manualPlaceholder}
            onManualSubmit={onManualSubmit}
            showFileUpload={true}
            onFileUpload={handleFileSelected}
          />
        ) : isCameraOn ? (
          <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
            <Box
              component="video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              sx={{ width: "100%", height: "100%", objectFit: "contain", transform: "scaleX(-1)" }}
            />

            {!cameraReady ? (
              <Stack
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(10, 14, 23, 0.8)",
                  backdropFilter: "blur(4px)",
                  color: "common.white",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                spacing={1.5}
              >
                <CircularProgress size={32} sx={{ color: "#D4AF37" }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Đang kết nối camera sinh trắc học...</Typography>
              </Stack>
            ) : overlayGuide === "face" ? (
              /* Biometric Face Viewfinder Overlay */
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* 4 Corner Markers */}
                <Box sx={{ position: "absolute", top: 16, left: 16, width: 24, height: 24, borderTop: "3px solid #D4AF37", borderLeft: "3px solid #D4AF37", borderRadius: "2px 0 0 0" }} />
                <Box sx={{ position: "absolute", top: 16, right: 16, width: 24, height: 24, borderTop: "3px solid #D4AF37", borderRight: "3px solid #D4AF37", borderRadius: "0 2px 0 0" }} />
                <Box sx={{ position: "absolute", bottom: 16, left: 16, width: 24, height: 24, borderBottom: "3px solid #D4AF37", borderLeft: "3px solid #D4AF37", borderRadius: "0 0 0 2px" }} />
                <Box sx={{ position: "absolute", bottom: 16, right: 16, width: 24, height: 24, borderBottom: "3px solid #D4AF37", borderRight: "3px solid #D4AF37", borderRadius: "0 0 2px 0" }} />

                {/* Face Oval Reticle */}
                <Box
                  sx={{
                    width: { xs: "55%", sm: "44%" },
                    height: { xs: "72%", sm: "68%" },
                    borderRadius: "50%",
                    border: "2px dashed rgba(212, 175, 55, 0.85)",
                    boxShadow: "0 0 24px rgba(212, 175, 55, 0.25), inset 0 0 20px rgba(212, 175, 55, 0.1)",
                    position: "relative",
                    animation: "pulse 2.5s infinite ease-in-out",
                    "@keyframes pulse": {
                      "0%, 100%": { opacity: 0.85, transform: "scale(1)" },
                      "50%": { opacity: 1, transform: "scale(1.02)" },
                    },
                  }}
                />

                {/* Guide Prompt Pill */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    bgcolor: "rgba(10, 14, 23, 0.75)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    px: 2,
                    py: 0.5,
                    borderRadius: 99,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: "0.02em" }}>
                    Căn chỉnh khuôn mặt vào giữa khung tròn
                  </Typography>
                </Box>
              </Box>
            ) : null}
          </Box>
        ) : (
          /* Empty / Standby State */
          <Stack
            spacing={1.75}
            sx={{
              alignItems: "center",
              textAlign: "center",
              color: "grey.300",
              p: 3,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "rgba(255, 255, 255, 0.06)",
                border: "1px dashed rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#D4AF37",
              }}
            >
              <PhotoCameraOutlinedIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#fff", mb: 0.5 }}>
                {title || "Chụp hoặc Tải ảnh khuôn mặt"}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)", maxWidth: 300, display: "block" }}>
                Bật webcam để chụp trực tiếp hoặc kéo thả file ảnh chân dung vào khung này
              </Typography>
            </Box>
            {error ? (
              <Chip
                label={error}
                color="error"
                size="small"
                sx={{ maxWidth: 360, height: "auto", py: 0.5, "& .MuiChip-label": { whiteSpace: "normal" } }}
              />
            ) : null}
          </Stack>
        )}
      </Paper>

      {/* Action Controls */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
        {image ? (
          <>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<CameraswitchOutlinedIcon />}
              onClick={reset}
              fullWidth
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Chụp lại
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileOutlinedIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ borderRadius: 2, fontWeight: 700, minWidth: 150 }}
            >
              Đổi ảnh khác
            </Button>
          </>
        ) : isCameraOn ? (
          <>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddAPhotoOutlinedIcon />}
              onClick={capturePhoto}
              disabled={!cameraReady}
              fullWidth
              sx={{ borderRadius: 2, fontWeight: 700, py: 1 }}
            >
              Chụp ảnh ngay
            </Button>
            <Button
              color="error"
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={stopCamera}
              sx={{ borderRadius: 2, fontWeight: 700, minWidth: 100 }}
            >
              Tắt
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="contained"
              startIcon={<PhotoCameraOutlinedIcon />}
              onClick={startCamera}
              fullWidth
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                py: 1,
                bgcolor: "#8B0000",
                "&:hover": { bgcolor: "#6b0000" },
              }}
            >
              Bật camera trực tiếp
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileOutlinedIcon />}
              onClick={() => fileInputRef.current?.click()}
              fullWidth
              sx={{ borderRadius: 2, fontWeight: 700, py: 1 }}
            >
              Tải ảnh từ máy
            </Button>
          </>
        )}
      </Stack>
    </Stack>
  );
}
