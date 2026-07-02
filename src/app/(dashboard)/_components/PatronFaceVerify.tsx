"use client";

import { useCallback, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAltOutlined";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { PatronPublic } from "@/lib/types";

export interface PatronVerifyResult {
  patron_id: string;
  student_code: string;
  full_name: string;
  score: number;
}

interface Props {
  onVerified: (result: PatronVerifyResult) => void;
  onClose?: () => void;
}

export default function PatronFaceVerify({ onVerified, onClose }: Props) {
  const [open, setOpen] = useState(true);
  const [studentCode, setStudentCode] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const handleOpen = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Không có quyền truy cập camera. Hãy cấp quyền camera cho trình duyệt.");
      } else if (err.name === "NotFoundError") {
        setError("Không tìm thấy camera trên thiết bị.");
      } else {
        setError("Không thể khởi động camera.");
      }
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setOpen(false);
    onClose?.();
  }, [stopCamera, onClose]);

  const captureAndVerify = useCallback(async () => {
    if (!videoRef.current || !studentCode.trim()) return;

    setCapturing(true);
    setError("");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context error");
      ctx.drawImage(videoRef.current, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Canvas toBlob failed"));
        }, "image/jpeg", 0.85);
      });

      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      setVerifying(true);
      const result = await api.kioskEnter(file, studentCode.trim());

      if (result.job_id) {
        let attempts = 0;
        const maxAttempts = 30;
        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 1000));
          const taskStatus = await api.getTaskStatus(result.job_id);
          if (taskStatus.status === "SUCCESS" && taskStatus.result) {
            const patronResult: PatronVerifyResult = {
              patron_id: taskStatus.result.patron_id || "",
              student_code: taskStatus.result.student_code || studentCode,
              full_name: taskStatus.result.full_name || "",
              score: taskStatus.result.score || 0,
            };
            stopCamera();
            setOpen(false);
            onVerified(patronResult);
            return;
          }
          if (taskStatus.status === "FAILURE" || taskStatus.status === "ERROR") {
            const errMsg = taskStatus.result?.error || taskStatus.result?.detail || "Xác minh khuôn mặt thất bại";
            setError(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
            setVerifying(false);
            return;
          }
          attempts++;
        }
        setError("Hết thời gian chờ xác minh. Vui lòng thử lại.");
      } else if (result.patron) {
        const patronResult: PatronVerifyResult = {
          patron_id: result.patron.id,
          student_code: result.patron.student_code || studentCode,
          full_name: result.patron.full_name || "",
          score: result.confidence || 0,
        };
        stopCamera();
        setOpen(false);
        onVerified(patronResult);
        return;
      } else {
        setError(result.message || "Không nhận diện được khuôn mặt");
      }
    } catch (err) {
      setError(getErrorMessage(err) || "Lỗi xác minh khuôn mặt");
    } finally {
      setCapturing(false);
      setVerifying(false);
    }
  }, [studentCode, stopCamera, onVerified]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <PersonIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Xác minh độc giả bằng khuôn mặt</Typography>
          </Stack>
          <IconButton size="small" onClick={handleClose}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Nhập mã số sinh viên và đưa khuôn mặt vào camera để xác minh độc giả đang ở trong thư viện.
          </Typography>

          <TextField
            label="Mã số sinh viên"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            placeholder="VD: B21DCCN001"
            fullWidth
            slotProps={{ htmlInput: { sx: { fontFamily: "monospace" } } }}
          />

          <Box
            sx={{
              position: "relative",
              aspectRatio: "4/3",
              bgcolor: "black",
              borderRadius: 1,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!streamRef.current ? (
              <Stack spacing={2} sx={{ alignItems: "center", color: "grey.300", p: 3 }}>
                <CameraAltIcon sx={{ fontSize: 48 }} />
                <Button variant="outlined" onClick={handleOpen} startIcon={<CameraAltIcon />}>
                  Bật camera
                </Button>
              </Stack>
            ) : (
              <>
                <Box
                  component="video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  sx={{ width: "100%", height: "100%", objectFit: "contain", transform: "scaleX(-1)" }}
                />
                {!cameraReady && (
                  <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }} spacing={1}>
                    <CircularProgress size={26} color="inherit" />
                    <Typography variant="body2">Đang kết nối camera...</Typography>
                  </Stack>
                )}
              </>
            )}
          </Box>

          {error && (
            <Box sx={{ p: 1.5, bgcolor: "error.50", borderRadius: 1, border: 1, borderColor: "error.main" }}>
              <Typography color="error" variant="body2">{error}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={verifying}>Hủy</Button>
        <Button
          variant="contained"
          disabled={verifying || !studentCode.trim() || !streamRef.current}
          onClick={captureAndVerify}
          startIcon={verifying ? <CircularProgress size={16} color="inherit" /> : <CameraAltIcon />}
        >
          {verifying ? "Đang xác minh..." : "Chụp & Xác minh"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}