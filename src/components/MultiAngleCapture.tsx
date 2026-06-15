"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";

export type CaptureAngle = "frontal" | "right" | "left" | "down";
export type MultiAngleCaptureStatus = "pending" | "capturing" | "done";

export interface AngleConfig {
  angle: CaptureAngle;
  instruction: string;
  tip: string;
}

export interface CapturedAngle {
  angle: CaptureAngle;
  status: MultiAngleCaptureStatus;
  file: File | null;
  dataUrl: string | null;
}

export interface MultiAngleCaptureProps {
  angles?: AngleConfig[];
  consent: boolean;
  setConsent?: (v: boolean) => void;
  onFilesReady: (files: Record<CaptureAngle, File>) => Promise<void> | void;
  className?: string;
}

function captureFromVideo(video: HTMLVideoElement, cameraReady: boolean) {
  return new Promise<{ file: File; dataUrl: string }>((resolve, reject) => {
    if (!cameraReady) return reject(new Error("Camera chưa sẵn sàng"));
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return reject(new Error("Camera chưa khởi tạo"));
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Không thể tạo canvas"));

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Không thể tạo ảnh"));
        resolve({ file: new File([blob], "face_capture.jpg", { type: "image/jpeg" }), dataUrl });
      },
      "image/jpeg",
      0.9
    );
  });
}

function getCameraErrorMessage(err: unknown) {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Không có quyền truy cập camera. Hãy cấp quyền camera cho trình duyệt rồi thử lại.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Không tìm thấy camera phù hợp. Hãy kiểm tra thiết bị camera rồi thử lại.";
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return "Camera đang được ứng dụng khác sử dụng hoặc không mở được. Hãy đóng ứng dụng khác rồi thử lại.";
  }
  return "Không thể mở camera. Hãy kiểm tra quyền truy cập, thiết bị camera và thử lại.";
}

const ANGLE_LABELS: Record<CaptureAngle, string> = {
  frontal: "Nhìn thẳng",
  right: "Quay phải",
  left: "Quay trái",
  down: "Cúi xuống",
};

export default function MultiAngleCapture({
  angles,
  consent,
  setConsent,
  onFilesReady,
  className,
}: MultiAngleCaptureProps) {
  const theme = useTheme();
  const defaultAngles = useMemo<AngleConfig[]>(
    () =>
      angles ?? [
        { angle: "frontal", instruction: "Nhìn thẳng", tip: "Giữ mặt thẳng, mắt mở tự nhiên" },
        { angle: "right", instruction: "Quay phải", tip: "Xoay đầu sang phải khoảng 30 độ" },
        { angle: "left", instruction: "Quay trái", tip: "Xoay đầu sang trái khoảng 30 độ" },
        { angle: "down", instruction: "Cúi xuống", tip: "Cúi nhẹ cằm xuống ngực" },
      ],
    [angles]
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [currentAngleIdx, setCurrentAngleIdx] = useState(-1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captures, setCaptures] = useState<CapturedAngle[]>(
    defaultAngles.map((item) => ({ angle: item.angle, status: "pending", file: null, dataUrl: null }))
  );

  useEffect(() => {
    setCaptures(defaultAngles.map((item) => ({ angle: item.angle, status: "pending", file: null, dataUrl: null })));
  }, [defaultAngles]);

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
      setCameraError("");
      setCameraReady(false);
      setIsCameraOn(false);
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraOn(true);
      return true;
    } catch (err) {
      setIsCameraOn(false);
      setCameraReady(false);
      setCameraError(getCameraErrorMessage(err));
      return false;
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const onReady = () => setCameraReady(true);
    const handleError = () => setCameraReady(false);

    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = handleError;
    video.srcObject = streamRef.current;

    if (video.readyState >= 2) onReady();
    const timer = setTimeout(() => setCameraReady(true), 3000);

    return () => {
      clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onplaying = null;
      video.onerror = null;
      video.srcObject = null;
    };
  }, [isCameraOn]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const retakeAngle = useCallback(
    async (idx: number) => {
      setCaptures((prev) =>
        prev.map((item, index) => (index === idx ? { ...item, status: "pending", file: null, dataUrl: null } : item))
      );
      const opened = await startCamera();
      if (!opened) return;
      setIsSequenceRunning(true);
      setTimeout(() => setCurrentAngleIdx(idx), 500);
    },
    [startCamera]
  );

  const startSequence = useCallback(async () => {
    setCaptures(defaultAngles.map((item) => ({ angle: item.angle, status: "pending", file: null, dataUrl: null })));
    setCountdown(null);
    const opened = await startCamera();
    if (!opened) {
      setCurrentAngleIdx(-1);
      setIsSequenceRunning(false);
      return;
    }
    setCurrentAngleIdx(0);
    setIsSequenceRunning(true);
  }, [defaultAngles, startCamera]);

  useEffect(() => {
    if (currentAngleIdx < 0 || currentAngleIdx >= defaultAngles.length) return;
    if (!cameraReady || !isSequenceRunning) return;

    let cancelled = false;
    let currentCountdown = 5;

    setCountdown(currentCountdown);
    setCaptures((prev) => prev.map((item, index) => (index === currentAngleIdx ? { ...item, status: "capturing" } : item)));

    const timer = window.setInterval(async () => {
      currentCountdown--;
      if (cancelled) {
        clearInterval(timer);
        return;
      }

      if (currentCountdown <= 0) {
        clearInterval(timer);
        setCountdown(null);

        try {
          const video = videoRef.current;
          if (!video) throw new Error("Không tìm thấy video");

          const { file, dataUrl } = await captureFromVideo(video, cameraReady);
          if (cancelled) return;

          setCaptures((prev) =>
            prev.map((item, index) => (index === currentAngleIdx ? { ...item, status: "done", file, dataUrl } : item))
          );

          const nextIdx = currentAngleIdx + 1;
          if (nextIdx >= defaultAngles.length) {
            setIsSequenceRunning(false);
            setCurrentAngleIdx(-1);
            stopCamera();
          } else {
            setTimeout(() => {
              if (!cancelled) setCurrentAngleIdx(nextIdx);
            }, 800);
          }
        } catch (err) {
          if (cancelled) return;
          setCameraError(getCameraErrorMessage(err));
          setCaptures((prev) => prev.map((item, index) => (index === currentAngleIdx ? { ...item, status: "pending" } : item)));
          setIsSequenceRunning(false);
          setCurrentAngleIdx(-1);
          stopCamera();
        }
      } else {
        setCountdown(currentCountdown);
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [currentAngleIdx, cameraReady, isSequenceRunning, defaultAngles.length, stopCamera]);

  const allCaptured = captures.every((item) => item.status === "done" && Boolean(item.file));
  const doneCount = captures.filter((item) => item.status === "done").length;

  const capturedFiles = useMemo(() => {
    const result = {} as Record<CaptureAngle, File>;
    for (const item of captures) {
      if (item.status === "done" && item.file) {
        result[item.angle] = item.file;
      }
    }
    return result;
  }, [captures]);

  const submit = useCallback(async () => {
    if (!consent || !allCaptured) return;
    await onFilesReady(capturedFiles);
  }, [allCaptured, capturedFiles, consent, onFilesReady]);

  const currentConfig = currentAngleIdx >= 0 ? defaultAngles[currentAngleIdx] : null;

  return (
    <Box className={className}>
      {!allCaptured && !isSequenceRunning && currentAngleIdx < 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              <PhotoCameraOutlinedIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                Chụp khuôn mặt từ 4 góc
              </Typography>
              <Typography color="text.secondary">
                Nhận diện nhanh hơn, chính xác hơn tại cổng.
              </Typography>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, width: "100%", bgcolor: "action.hover", textAlign: "left" }}>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 850, mb: 1 }}>
                Lưu ý khi chụp
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">- Đủ ánh sáng, không ngược sáng.</Typography>
                <Typography variant="body2" color="text.secondary">- Giữ yên khi đếm ngược về 0.</Typography>
                <Typography variant="body2" color="text.secondary">- Mặt vừa đủ trong khung tròn.</Typography>
              </Stack>
            </Paper>

            {cameraError && <Alert severity="warning" sx={{ width: "100%" }}>{cameraError}</Alert>}

            <Button variant="contained" size="large" startIcon={<PhotoCameraOutlinedIcon />} onClick={startSequence}>
              Bắt đầu chụp
            </Button>
          </Stack>
        </Paper>
      )}

      {(isSequenceRunning || currentAngleIdx >= 0) && (
        <Paper
          variant="outlined"
          sx={{
            position: "relative",
            aspectRatio: "16 / 9",
            overflow: "hidden",
            bgcolor: "black",
          }}
        >
          <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Box sx={{ width: 150, height: 150, border: 2, borderColor: "primary.main", borderRadius: "50%", opacity: 0.75 }} />
          </Box>

          {!cameraReady && (
            <Stack
              spacing={1}
              sx={{
                position: "absolute",
                inset: 0,
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(0,0,0,.65)",
                color: "common.white",
              }}
            >
              <CircularProgress color="inherit" size={30} />
              <Typography variant="body2">{cameraError || "Đang mở camera..."}</Typography>
            </Stack>
          )}

          {countdown !== null && currentConfig && (
            <Stack
              spacing={2}
              sx={{
                position: "absolute",
                inset: 0,
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(0,0,0,.78)",
                color: "common.white",
                textAlign: "center",
                p: 2,
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 850 }}>{currentConfig.instruction}</Typography>
                <Typography variant="body2" sx={{ color: "grey.300", mt: 0.5 }}>{currentConfig.tip}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {defaultAngles.map((item, index) => (
                  <Box
                    key={item.angle}
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: index < doneCount ? "success.main" : index === currentAngleIdx ? "primary.main" : "grey.600",
                    }}
                  />
                ))}
              </Stack>
              {countdown === 1 && <Chip color="error" label="GIỮ YÊN!" />}
              <Typography sx={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>{countdown}</Typography>
            </Stack>
          )}
        </Paper>
      )}

      {allCaptured && (
        <Stack spacing={2}>
          <Grid container spacing={1.5}>
            {captures.map((item, index) => (
              <Grid key={item.angle} size={{ xs: 6, sm: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    overflow: "hidden",
                    borderColor: item.status === "done" ? "success.main" : "divider",
                  }}
                >
                  {item.dataUrl ? (
                    <Box component="img" src={item.dataUrl} alt={item.angle} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", bgcolor: "action.hover", color: "text.secondary" }}>
                      <PhotoCameraOutlinedIcon />
                    </Stack>
                  )}
                  <Chip
                    size="small"
                    label={ANGLE_LABELS[item.angle]}
                    sx={{ position: "absolute", left: 6, bottom: 6, bgcolor: "rgba(0,0,0,.72)", color: "common.white" }}
                  />
                  {item.status === "done" && (
                    <Box sx={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", bgcolor: "success.main", color: "success.contrastText", display: "grid", placeItems: "center" }}>
                      <CheckOutlinedIcon sx={{ fontSize: 16 }} />
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            {captures.map((item, index) => (
              <Button
                key={item.angle}
                variant="outlined"
                size="small"
                startIcon={<RestartAltOutlinedIcon />}
                onClick={() => retakeAngle(index)}
                sx={{ flex: 1 }}
              >
                {ANGLE_LABELS[item.angle]}
              </Button>
            ))}
          </Stack>

          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "action.hover" }}>
            <FormControlLabel
              control={<Checkbox checked={consent} onChange={(event) => setConsent?.(event.target.checked)} disabled={!setConsent} />}
              label="Tôi đồng ý cho hệ thống xử lý dữ liệu khuôn mặt để nhận diện tại cổng."
              sx={{ m: 0, color: "text.secondary" }}
            />
          </Paper>

          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<AddAPhotoOutlinedIcon />}
            onClick={submit}
            disabled={!consent}
            fullWidth
          >
            Xác nhận {doneCount} góc ảnh
          </Button>
        </Stack>
      )}
    </Box>
  );
}
