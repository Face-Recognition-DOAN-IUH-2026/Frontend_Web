"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import VideocamOffOutlinedIcon from "@mui/icons-material/VideocamOffOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import WbIncandescentOutlinedIcon from "@mui/icons-material/WbIncandescentOutlined";
import CameraFallback from "@/app/_components/CameraFallback";

interface LoginFormFaceProps {
  onFaceLogin: (file: File) => Promise<void>;
  isLoading: boolean;
  onSwitchToPassword: (prefillEmail?: string) => void;
  setError: (err: string) => void;
}

export default function LoginFormFace({
  onFaceLogin,
  isLoading,
  onSwitchToPassword,
  setError,
}: LoginFormFaceProps) {
  const theme = useTheme();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showFaceFallback, setShowFaceFallback] = useState(false);
  const [countdownProgress, setCountdownProgress] = useState(100);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCaptureRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFaceFrameRef = useRef<string | null>(null);
  const hasFaceCameraWorkedRef = useRef(false);

  // Ref giữ onFaceLogin mới nhất → executeFaceLogin ổn định identity, đếm ngược
  // auto-capture không bị reset mỗi lần parent render (tránh vòng lặp update).
  const onFaceLoginRef = useRef(onFaceLogin);
  onFaceLoginRef.current = onFaceLogin;

  const stopCamera = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
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
    setCountdownProgress(100);
  }, []);

  const resetFaceState = () => {
    setImagePreview(null);
    setShowFaceFallback(false);
    setCountdownProgress(100);
  };

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setShowFaceFallback(false);
      setCameraReady(false);
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Không có quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.");
      } else if (err.name === "NotFoundError") {
        setError("Không tìm thấy camera trên thiết bị này.");
      } else {
        setError("Không thể khởi động camera.");
      }
      setIsCameraOn(false);
      setShowFaceFallback(true);
    }
  }, [stopCamera, setError]);

  // Video stream initialization
  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const onReady = () => {
      setCameraReady(true);
      hasFaceCameraWorkedRef.current = true;
    };
    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = () => {
      setError("Camera gặp sự cố phát hình ảnh.");
      setShowFaceFallback(true);
    };
    video.srcObject = streamRef.current;
    if (video.readyState >= 2) {
      onReady();
      hasFaceCameraWorkedRef.current = true;
    }
    readyTimeoutRef.current = setTimeout(() => {
      setCameraReady(true);
      hasFaceCameraWorkedRef.current = true;
    }, 2500);

    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
      video.onloadedmetadata = null;
      video.onplaying = null;
      video.onerror = null;
      video.srcObject = null;
    };
  }, [isCameraOn, setError]);

  // Periodic frame capture for fallback preview
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
        lastFaceFrameRef.current = canvas.toDataURL("image/jpeg", 0.3);
      } catch {
        lastFaceFrameRef.current = null;
      }
    }, 2000);
    return () => {
      if (frameCaptureRef.current) clearInterval(frameCaptureRef.current);
    };
  }, [isCameraOn, cameraReady]);

  // Clean-up on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  const capturePhoto = useCallback((callback?: (file: File) => void) => {
    const video = videoRef.current;
    if (!video || !cameraReady || video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "face.jpg", { type: "image/jpeg" });
      setImagePreview(canvas.toDataURL("image/jpeg"));
      callback?.(file);
    }, "image/jpeg", 0.92);
  }, [cameraReady]);

  const executeFaceLogin = useCallback(() => {
    capturePhoto((file) => {
      stopCamera();
      onFaceLoginRef.current(file).catch(() => {
        resetFaceState();
      });
    });
  }, [capturePhoto, stopCamera]);

  // Auto-capture with smooth visual countdown (2.4s)
  useEffect(() => {
    if (cameraReady && !imagePreview && !isLoading) {
      const TOTAL_STEPS = 24;
      const STEP_TIME = 100; // 24 * 100ms = 2400ms
      let currentStep = TOTAL_STEPS;
      setCountdownProgress(100);

      countdownIntervalRef.current = setInterval(() => {
        currentStep -= 1;
        setCountdownProgress((currentStep / TOTAL_STEPS) * 100);
        if (currentStep <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          executeFaceLogin();
        }
      }, STEP_TIME);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [cameraReady, imagePreview, isLoading, executeFaceLogin]);

  return (
    <Stack spacing={2.5}>
      <Paper
        variant="outlined"
        sx={{
          aspectRatio: "4 / 3",
          overflow: "hidden",
          bgcolor: isCameraOn || imagePreview ? "#07111E" : (theme.palette.mode === "dark" ? "background.paper" : "#F8FAFC"),
          display: "grid",
          placeItems: "center",
          position: "relative",
          borderRadius: 3.5,
          borderColor: isCameraOn ? "transparent" : "divider",
          boxShadow: isCameraOn
            ? "0 12px 32px -4px rgba(7, 17, 30, 0.4), 0 0 0 1px rgba(255,255,255,0.06)"
            : "0 2px 10px rgba(0,0,0,0.03)",
          transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* CSS Animations */}
        <Box
          component="style"
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes scanLaser {
                0% { top: 14%; opacity: 0.3; }
                50% { opacity: 0.95; }
                100% { top: 84%; opacity: 0.3; }
              }
              @keyframes pulseHud {
                0%, 100% { transform: scale(1); opacity: 0.85; }
                50% { transform: scale(1.015); opacity: 1; }
              }
              @keyframes rippleRing {
                0% { transform: scale(0.96); opacity: 0.8; }
                100% { transform: scale(1.08); opacity: 0; }
              }
            `,
          }}
        />

        {/* ── STATE 1: Display Captured Image Preview + In-Frame Verification ── */}
        {imagePreview ? (
          <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
            <Box
              component="img"
              src={imagePreview}
              alt="Ảnh khuôn mặt độc giả"
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* In-Frame Verification Overlay (Prevents Layout Shift) */}
            {isLoading && (
              <Stack
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(7, 17, 30, 0.78)",
                  backdropFilter: "blur(6px)",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  p: 3,
                  textAlign: "center",
                  gap: 1.5,
                  zIndex: 10,
                }}
              >
                <Box sx={{ position: "relative", display: "grid", placeItems: "center" }}>
                  <CircularProgress
                    size={56}
                    thickness={3.5}
                    sx={{ color: "primary.main" }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      width: 70,
                      height: 70,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.2)",
                      animation: "rippleRing 1.5s infinite ease-out",
                    }}
                  />
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5, mt: 0.5 }}>
                  Đang đối soát sinh trắc học...
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Hệ thống AI đang so khớp khuôn mặt với cơ sở dữ liệu thư viện
                </Typography>
              </Stack>
            )}
          </Box>
        ) : showFaceFallback ? (
          /* ── STATE 2: Camera Fallback ── */
          <CameraFallback
            lastFrameUrl={hasFaceCameraWorkedRef.current ? lastFaceFrameRef.current : null}
            onRetry={startCamera}
            showManualInput
            manualLabel="Email"
            manualPlaceholder="Nhập email để đăng nhập..."
            onManualSubmit={(value) => onSwitchToPassword(value)}
            showFileUpload={false}
          />
        ) : isCameraOn ? (
          /* ── STATE 3: Active Camera & Biometric Oval HUD ── */
          <>
            <Box
              component="video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)", // Mirror effect for natural selfie alignment
              }}
            />

            {/* Connecting Camera Overlay */}
            {!cameraReady && (
              <Stack
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(7, 17, 30, 0.85)",
                  color: "white",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 4,
                }}
              >
                <CircularProgress color="inherit" size={32} thickness={4} />
                <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                  Đang kết nối camera...
                </Typography>
              </Stack>
            )}

            {/* Biometric Face ID Mask & HUD */}
            {cameraReady && (
              <>
                {/* Oval Biometric Reticle */}
                <Box
                  sx={{
                    position: "absolute",
                    width: "54%",
                    height: "72%",
                    borderRadius: "48%",
                    border: "2px solid",
                    borderColor: "primary.light",
                    boxShadow: "0 0 0 9999px rgba(7, 17, 30, 0.58)",
                    zIndex: 2,
                    animation: "pulseHud 3s infinite ease-in-out",
                    pointerEvents: "none",
                  }}
                />

                {/* Corner Target Marks (Biometric Framing) */}
                <Box
                  sx={{
                    position: "absolute",
                    width: "60%",
                    height: "78%",
                    zIndex: 2,
                    pointerEvents: "none",
                    "&::before, &::after": {
                      content: '""',
                      position: "absolute",
                      width: 18,
                      height: 18,
                      borderColor: "rgba(255, 255, 255, 0.65)",
                    },
                    "&::before": {
                      top: 0,
                      left: 0,
                      borderTop: "2px solid",
                      borderLeft: "2px solid",
                      borderTopLeftRadius: "6px",
                    },
                    "&::after": {
                      top: 0,
                      right: 0,
                      borderTop: "2px solid",
                      borderRight: "2px solid",
                      borderTopRightRadius: "6px",
                    },
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    width: "60%",
                    height: "78%",
                    zIndex: 2,
                    pointerEvents: "none",
                    "&::before, &::after": {
                      content: '""',
                      position: "absolute",
                      width: 18,
                      height: 18,
                      borderColor: "rgba(255, 255, 255, 0.65)",
                    },
                    "&::before": {
                      bottom: 0,
                      left: 0,
                      borderBottom: "2px solid",
                      borderLeft: "2px solid",
                      borderBottomLeftRadius: "6px",
                    },
                    "&::after": {
                      bottom: 0,
                      right: 0,
                      borderBottom: "2px solid",
                      borderRight: "2px solid",
                      borderBottomRightRadius: "6px",
                    },
                  }}
                />

                {/* Scanning Laser Beam */}
                <Box
                  sx={{
                    position: "absolute",
                    width: "52%",
                    height: "2px",
                    background: "linear-gradient(90deg, transparent, #D4AF37 30%, #8B0000 70%, transparent)",
                    boxShadow: "0 0 10px rgba(212, 175, 55, 0.8), 0 0 16px rgba(139, 0, 0, 0.6)",
                    zIndex: 3,
                    animation: "scanLaser 2.2s infinite ease-in-out",
                    pointerEvents: "none",
                  }}
                />

                {/* Top Status & Countdown Bar */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 14,
                    zIndex: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.8,
                    py: 0.6,
                    borderRadius: 20,
                    bgcolor: "rgba(7, 17, 30, 0.72)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "white",
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: countdownProgress > 20 ? "#10B981" : "#F59E0B",
                      boxShadow: `0 0 8px ${countdownProgress > 20 ? "#10B981" : "#F59E0B"}`,
                    }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.78rem" }}>
                    Tự động nhận diện sau {Math.max(1, Math.ceil((countdownProgress / 100) * 2.4))}s
                  </Typography>
                </Box>

                {/* Bottom Guidance Tag */}
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    bottom: 14,
                    zIndex: 4,
                    color: "rgba(255,255,255,0.9)",
                    bgcolor: "rgba(7, 17, 30, 0.68)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    px: 2,
                    py: 0.5,
                    borderRadius: 4,
                    fontSize: "0.76rem",
                  }}
                >
                  Giữ khuôn mặt ổn định trong khung elip
                </Typography>
              </>
            )}
          </>
        ) : (
          /* ── STATE 4: Friendly Initial State (Not Connected Yet) ── */
          <Stack
            spacing={2}
            sx={{
              alignItems: "center",
              px: 3,
              textAlign: "center",
              py: 2,
            }}
          >
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                border: "1px solid",
                borderColor: alpha(theme.palette.primary.main, 0.2),
                display: "grid",
                placeItems: "center",
                color: "primary.main",
                position: "relative",
              }}
            >
              <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 40 }} />
              <Box
                sx={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  bgcolor: "background.paper",
                  borderRadius: "50%",
                  p: 0.3,
                  display: "grid",
                  placeItems: "center",
                  color: "secondary.main",
                }}
              >
                <VerifiedUserOutlinedIcon sx={{ fontSize: 18 }} />
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Đăng nhập khuôn mặt AI
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem", maxWidth: 280 }}>
                Nhận diện nhanh không cần nhập mật khẩu. Vui lòng bật camera để tiếp tục.
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                alignItems: "center",
              }}
            >
              <WbIncandescentOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                Đảm bảo đủ ánh sáng và không đeo khẩu trang
              </Typography>
            </Stack>
          </Stack>
        )}
      </Paper>

      {/* ── Control Actions ── */}
      {imagePreview ? (
        <Button
          variant="outlined"
          startIcon={<RefreshOutlinedIcon />}
          onClick={() => {
            resetFaceState();
            startCamera();
          }}
          disabled={isLoading}
          fullWidth
          size="medium"
          sx={{ borderRadius: 2.5, py: 1.1, fontWeight: 600 }}
        >
          Chụp lại
        </Button>
      ) : !isCameraOn ? (
        <Button
          variant="contained"
          startIcon={<PhotoCameraOutlinedIcon />}
          onClick={startCamera}
          size="large"
          fullWidth
          sx={{
            py: 1.35,
            fontWeight: 700,
            borderRadius: 2.5,
            boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
          }}
        >
          Bật camera
        </Button>
      ) : (
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            startIcon={<PhotoCameraOutlinedIcon />}
            onClick={executeFaceLogin}
            disabled={!cameraReady || isLoading}
            fullWidth
            size="large"
            sx={{
              py: 1.3,
              fontWeight: 700,
              borderRadius: 2.5,
              boxShadow: "0 4px 14px rgba(139, 0, 0, 0.25)",
            }}
          >
            Chụp ngay
          </Button>
          <Button
            color="inherit"
            variant="outlined"
            startIcon={<VideocamOffOutlinedIcon />}
            onClick={stopCamera}
            disabled={isLoading}
            sx={{
              borderRadius: 2.5,
              minWidth: 120,
              borderColor: "divider",
              color: "text.secondary",
              "&:hover": { borderColor: "text.primary", color: "text.primary" },
            }}
          >
            Tắt
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
