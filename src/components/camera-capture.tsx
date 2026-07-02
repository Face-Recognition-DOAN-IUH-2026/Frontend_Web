"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import CameraswitchOutlinedIcon from "@mui/icons-material/CameraswitchOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";


export default function CameraCapture({
  onCapture,
}: {
  onCapture: (file: File, dataUrl: string) => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState<string>("");
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCamera = useCallback(() => {
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
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const onReady = () => setCameraReady(true);
    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = () => setError("Camera gặp lỗi khi phát hình.");
    video.srcObject = streamRef.current;
    if (video.readyState >= 2) onReady();
    readyTimeoutRef.current = setTimeout(() => setCameraReady(true), 3000);
    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
      video.onloadedmetadata = null;
      video.onplaying = null;
      video.onerror = null;
      video.srcObject = null;
    };
  }, [isCameraOn]);

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
      const capturedFile = new File([blob], "face_capture.jpg", { type: "image/jpeg" });
      const dataUrl = canvas.toDataURL("image/jpeg");
      setImage(dataUrl);
      onCapture(capturedFile, dataUrl);
      stopCamera();
    }, "image/jpeg", 0.9);
  };

  const reset = () => {
    setImage(null);
    setError("");
    stopCamera();
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <Stack spacing={1.5}>
      <Paper
        variant="outlined"
        sx={{
          position: "relative",
          overflow: "hidden",
          bgcolor: "black",
          aspectRatio: "16 / 9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {image ? (
          <Box component="img" src={image} alt="Ảnh đã chụp" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : isCameraOn ? (
          <>
            <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
            {!cameraReady && (
              <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
                <CircularProgress size={26} color="inherit" />
                <Typography variant="body2">Đang kết nối camera...</Typography>
              </Stack>
            )}
          </>
        ) : (
          <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center", color: "grey.300", p: 3 }}>
            <PhotoCameraOutlinedIcon sx={{ fontSize: 42 }} />
            <Typography>{error || "Bật camera để bắt đầu."}</Typography>
          </Stack>
        )}
      </Paper>

      {error && !isCameraOn && <Alert severity="warning">{error}</Alert>}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        {image ? (
          <Button variant="outlined" startIcon={<CameraswitchOutlinedIcon />} onClick={reset} fullWidth>
            Chụp lại
          </Button>
        ) : !isCameraOn ? (
          <Button variant="contained" startIcon={<PhotoCameraOutlinedIcon />} onClick={startCamera} fullWidth>
            Bật camera
          </Button>
        ) : (
          <Button variant="contained" startIcon={<AddAPhotoOutlinedIcon />} onClick={capturePhoto} disabled={!cameraReady} fullWidth>
            Chụp ảnh
          </Button>
        )}

        {isCameraOn && !image && (
          <Button color="error" variant="text" onClick={stopCamera}>
            Tắt
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
