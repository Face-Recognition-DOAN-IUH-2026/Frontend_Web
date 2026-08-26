"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import { useAuth } from "@/lib/auth-context";
import api, { getErrorMessage } from "@/lib/api-client";
import CameraFallback from "@/app/_components/CameraFallback";
import dynamic from "next/dynamic";
const LoginBackground3D = dynamic(() => import("@/app/login/_components/LoginBackground3D"), { ssr: false });

type LoginMode = "password" | "face";

export default function LoginPage() {
  const theme = useTheme();
  const { login, setAuthFromToken } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showFaceFallback, setShowFaceFallback] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3 | 4>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const faceFailCountRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameCaptureRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFaceFrameRef = useRef<string | null>(null);
  const hasFaceCameraWorkedRef = useRef(false);

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

  const resetFaceState = () => {
    setImagePreview(null);
    setShowFaceFallback(false);
  };

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setShowFaceFallback(false);
      setCameraReady(false);
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setError("Không có quyền truy cập camera. Hãy cấp quyền camera rồi thử lại.");
      else if (err.name === "NotFoundError") setError("Không tìm thấy camera trên thiết bị.");
      else setError("Không thể truy cập camera.");
      setIsCameraOn(false);
      setShowFaceFallback(true);
    }
  }, [stopCamera]);

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
      setError("Camera gặp lỗi.");
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
    }, 3000);
    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
      if (autoCaptureTimeoutRef.current) clearTimeout(autoCaptureTimeoutRef.current);
      video.onloadedmetadata = null;
      video.onplaying = null;
      video.onerror = null;
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
        lastFaceFrameRef.current = canvas.toDataURL("image/jpeg", 0.3);
      } catch {
        lastFaceFrameRef.current = null;
      }
    }, 2000);
    return () => {
      if (frameCaptureRef.current) clearInterval(frameCaptureRef.current);
    };
  }, [isCameraOn, cameraReady]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const doFaceLogin = useCallback(async (file: File) => {
    setError("");
    setIsLoading(true);
    try {
      const res = await api.faceLogin(file);
      if (!res.access_token) throw new Error("Backend did not return access_token");
      const payload = JSON.parse(atob(res.access_token.split(".")[1]));
      const userEmail = payload?.email || "";
      const role = ((payload?.roles as string[])?.[0]) || "user";
      setAuthFromToken(res.access_token, res.refresh_token, userEmail, role);
      setSuccess(true);
      setIsLoading(false);
      faceFailCountRef.current = 0;
      setTimeout(() => { window.location.href = "/dashboard"; }, 500);
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Đăng nhập thất bại.";
      setError(msg);
      setIsLoading(false);
      const newCount = faceFailCountRef.current + 1;
      faceFailCountRef.current = newCount;
      if (newCount >= 2) {
        setMode("password");
        faceFailCountRef.current = 0;
        resetFaceState();
        stopCamera();
        setError(`${msg} Chuyển sang đăng nhập bằng mật khẩu.`);
      } else {
        resetFaceState();
        startCamera();
      }
    }
  }, [router, setAuthFromToken, startCamera, stopCamera]);

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
    }, "image/jpeg", 0.9);
  }, [cameraReady]);

  const autoCapture = useCallback(() => {
    capturePhoto((file) => {
      stopCamera();
      doFaceLogin(file);
    });
  }, [capturePhoto, doFaceLogin, stopCamera]);

  useEffect(() => {
    if (cameraReady && mode === "face" && !imagePreview && !isLoading) {
      autoCaptureTimeoutRef.current = setTimeout(autoCapture, 1500);
    }
    return () => {
      if (autoCaptureTimeoutRef.current) clearTimeout(autoCaptureTimeoutRef.current);
    };
  }, [cameraReady, mode, imagePreview, isLoading, autoCapture]);

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(getErrorMessage(err) || "Đăng nhập thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (_event: React.MouseEvent<HTMLElement>, value: LoginMode | null) => {
    if (!value) return;
    setMode(value);
    setError("");
    setShowFaceFallback(false);
    resetFaceState();
    faceFailCountRef.current = 0;
    if (value === "password") stopCamera();
  };

  const handleForgotSendCode = async () => {
    if (!forgotEmail) {
      setForgotError("Vui lòng nhập email");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      await api.forgotPassword(forgotEmail);
      setForgotStep(2);
      setResendCooldown(60);
    } catch (err: any) {
      setForgotError(getErrorMessage(err) || "Không thể gửi mã reset");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!forgotCode || forgotCode.length !== 6) {
      setForgotError("Vui lòng nhập đầy đủ 6 chữ số mã xác minh");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      await api.verifyResetCode(forgotEmail, forgotCode);
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(getErrorMessage(err) || "Mã xác minh không hợp lệ");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async () => {
    if (!forgotPassword || !forgotConfirmPassword) {
      setForgotError("Vui lòng nhập mật khẩu mới");
      return;
    }
    if (forgotPassword !== forgotConfirmPassword) {
      setForgotError("Mật khẩu mới không khớp");
      return;
    }
    if (forgotPassword.length < 6) {
      setForgotError("Mật khẩu phải ít nhất 6 ký tự");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      await api.resetPassword(forgotEmail, forgotCode, forgotPassword);
      setForgotStep(4);
      setTimeout(() => {
        closeForgotDialog();
      }, 2000);
    } catch (err: any) {
      setForgotError(getErrorMessage(err) || "Đặt lại mật khẩu thất bại");
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotDialog = () => {
    setForgotOpen(false);
    setForgotStep(1);
    setForgotEmail("");
    setForgotCode("");
    setForgotPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
    setShowForgotPassword(false);
  };

  return (
    <>
      {/* ── Split Layout: Brand Panel (left) + Form Panel (right) ── */}
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", lg: "55% 45%" },
        }}
      >
        {/* ─── LEFT PANEL — Brand / Hero ──────────────────────────────────── */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "space-between",
            p: { md: 5, lg: 6 },
            // Navy gradient — IUH brand
            background: `linear-gradient(145deg, #0F3C5C 0%, #1E6091 50%, #2980B9 100%)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative geometric shapes */}
          <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <Box sx={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)" }} />
            <Box sx={{ position: "absolute", top: 60, right: 60, width: 180, height: 180, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />
            <Box sx={{ position: "absolute", bottom: 80, left: -60, width: 280, height: 280, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />
            <Box sx={{ position: "absolute", bottom: -30, right: 100, width: 200, height: 200, borderRadius: "50%", bgcolor: "rgba(217,119,6,0.12)" }} />
            <Box sx={{
              position: "absolute", top: "40%", right: -40, width: 200, height: 200,
              background: "radial-gradient(circle, rgba(41,128,185,0.4) 0%, transparent 70%)",
            }} />
          </Box>

          {/* Logo + Brand */}
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", backdropFilter: "blur(8px)" }}>
                <AutoStoriesOutlinedIcon sx={{ color: "white", fontSize: 24 }} />
              </Box>
              <Box>
                <Typography sx={{ color: "white", fontWeight: 800, fontSize: "1rem", lineHeight: 1.2 }}>THƯ VIỆN IUH</Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.72rem" }}>Đại học Công nghiệp TP.HCM</Typography>
              </Box>
            </Box>
          </Box>

          {/* Main hero content */}
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Typography variant="h2" sx={{ color: "white", fontWeight: 800, lineHeight: 1.15, mb: 2.5, fontSize: { md: "2.4rem", lg: "2.8rem" } }}>
              Hệ thống Quản lý<br />
              <Box component="span" sx={{ color: "#FCD34D" }}>Thư viện Thông minh</Box>
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "1.05rem", lineHeight: 1.7, mb: 4 }}>
              Quản lý độc giả, mượn trả sách và kiểm soát ra vào tự động bằng công nghệ nhận diện khuôn mặt AI.
            </Typography>

            {/* Feature highlights */}
            {[
              { icon: <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 18 }} />, text: "Đăng nhập bằng khuôn mặt không cần thẻ" },
              { icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 18 }} />, text: "Theo dõi mượn trả sách thời gian thực" },
              { icon: <ShieldOutlinedIcon sx={{ fontSize: 18 }} />, text: "Kiểm soát ra vào tự động, bảo mật cao" },
            ].map((f, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.12)", display: "grid", placeItems: "center", color: "#FCD34D", flexShrink: 0 }}>
                  {f.icon}
                </Box>
                <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9rem" }}>{f.text}</Typography>
              </Box>
            ))}
          </Box>

          {/* Bottom quote */}
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Box sx={{ borderLeft: "3px solid rgba(252,211,77,0.6)", pl: 2 }}>
              <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", fontStyle: "italic" }}>
                "Tri thức là nền tảng của sự phát triển"
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", mt: 0.5 }}>— Trường Đại học Công nghiệp TP.HCM</Typography>
            </Box>
          </Box>
        </Box>

        {/* ─── RIGHT PANEL — Login Form ────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            p: { xs: 3, sm: 4, md: 5 },
            bgcolor: "background.default",
            minHeight: "100vh",
          }}
        >
          {/* Mobile-only logo */}
          <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1.5, mb: 4 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: "primary.main", display: "grid", placeItems: "center" }}>
              <AutoStoriesOutlinedIcon sx={{ color: "white" }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>THƯ VIỆN IUH</Typography>
              <Typography variant="caption" color="text.secondary">Hệ thống quản lý thư viện</Typography>
            </Box>
          </Box>

          <Box sx={{ width: "100%", maxWidth: 420 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Đăng nhập</Typography>
              <Typography color="text.secondary" sx={{ fontSize: "0.95rem" }}>
                Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.
              </Typography>
            </Box>

            {/* Mode Tabs — thực tế hơn ToggleButtonGroup */}
            <Box
              sx={{
                display: "flex",
                bgcolor: "action.hover",
                borderRadius: 2.5,
                p: 0.5,
                mb: 3.5,
              }}
            >
              {(["password", "face"] as LoginMode[]).map((m) => (
                <Box
                  key={m}
                  onClick={() => switchMode(null as any, m)}
                  sx={{
                    flex: 1,
                    py: 1.1,
                    borderRadius: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    ...(mode === m
                      ? {
                          bgcolor: "background.paper",
                          color: "primary.main",
                          boxShadow: "0 1px 6px rgba(30,96,145,0.15)",
                        }
                      : {
                          color: "text.secondary",
                          "&:hover": { color: "text.primary" },
                        }),
                  }}
                >
                  {m === "password"
                    ? <><LockOutlinedIcon sx={{ fontSize: 16 }} />Mật khẩu</>
                    : <><FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 16 }} />Khuôn mặt</>
                  }
                </Box>
              ))}
            </Box>

            {/* Error Alert */}
            {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

            {/* Success */}
            {success ? (
              <Alert icon={<CheckCircleOutlineOutlinedIcon />} severity="success" sx={{ mb: 2 }}>
                Đăng nhập thành công. Đang chuyển hướng...
              </Alert>
            ) : isLoading ? (
              <Stack sx={{ py: 5, alignItems: "center" }} spacing={2}>
                <CircularProgress />
                <Typography color="text.secondary">
                  {mode === "face" ? "Đang xác thực khuôn mặt..." : "Đang đăng nhập..."}
                </Typography>
              </Stack>
            ) : mode === "password" ? (
              <Box component="form" onSubmit={handlePasswordSubmit}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    fullWidth
                  />
                  <TextField
                    label="Mật khẩu"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    fullWidth
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  {/* Forgot password */}
                  <Box sx={{ textAlign: "right", mt: -1 }}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      sx={{
                        border: "none",
                        bgcolor: "transparent",
                        color: "primary.main",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      Quên mật khẩu?
                    </Box>
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<LoginOutlinedIcon />}
                    size="large"
                    fullWidth
                    sx={{ py: 1.4, fontWeight: 700 }}
                  >
                    Đăng nhập
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Stack spacing={2}>
                <Paper
                  variant="outlined"
                  sx={{
                    aspectRatio: "4 / 3",
                    overflow: "hidden",
                    bgcolor: "black",
                    display: "grid",
                    placeItems: "center",
                    position: "relative",
                    borderRadius: 3,
                    borderColor: "divider",
                  }}
                >
                  {imagePreview ? (
                    <Box component="img" src={imagePreview} alt="Ảnh khuôn mặt" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : showFaceFallback ? (
                    <CameraFallback
                      lastFrameUrl={hasFaceCameraWorkedRef.current ? lastFaceFrameRef.current : null}
                      onRetry={startCamera}
                      showManualInput
                      manualLabel="Email"
                      manualPlaceholder="Nhập email để đăng nhập..."
                      onManualSubmit={(value) => { setEmail(value); setMode("password"); }}
                      showFileUpload={false}
                    />
                  ) : isCameraOn ? (
                    <>
                      <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      {!cameraReady && (
                        <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }}>
                          <CircularProgress color="inherit" size={26} />
                          <Typography variant="body2" sx={{ mt: 1 }}>Đang kết nối camera...</Typography>
                        </Stack>
                      )}
                      {cameraReady && (
                        <Box sx={{ position: "absolute", width: "55%", aspectRatio: "1", border: "2px solid", borderColor: "primary.main", borderRadius: "50%", opacity: 0.8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }} />
                      )}
                    </>
                  ) : (
                    <Stack spacing={1.5} sx={{ alignItems: "center", color: "grey.500", px: 3, textAlign: "center" }}>
                      <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 48, opacity: 0.5 }} />
                      <Typography variant="body2">Bật camera để đăng nhập bằng khuôn mặt</Typography>
                    </Stack>
                  )}
                </Paper>

                {imagePreview ? (
                  <Button variant="outlined" onClick={() => { resetFaceState(); startCamera(); }}>Chụp lại</Button>
                ) : !isCameraOn ? (
                  <Button variant="contained" startIcon={<PhotoCameraOutlinedIcon />} onClick={startCamera} size="large" sx={{ py: 1.4, fontWeight: 700 }}>
                    Bật camera
                  </Button>
                ) : (
                  <Button color="error" variant="outlined" startIcon={<StopCircleOutlinedIcon />} onClick={stopCamera}>
                    Tắt camera
                  </Button>
                )}
              </Stack>
            )}

            {/* Footer */}
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", mt: 4 }}>
              © {new Date().getFullYear()} Thư Viện IUH — Hệ thống Quản lý Thư viện Thông minh
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ─── Forgot Password Dialog (giữ nguyên) ───────────────────────────── */}
      <Dialog open={forgotOpen} onClose={closeForgotDialog} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogContent sx={{ p: 3, pt: "20px !important" }}>
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {forgotStep === 4 ? "Thành công" : "Quên mật khẩu"}
            </Typography>
            <IconButton onClick={closeForgotDialog} size="small" sx={{ color: "text.secondary" }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Step Indicator - Dot style */}
          {forgotStep < 4 && (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 3, mt: 1.5 }}>
              {[1, 2, 3].map((s) => (
                <Box key={s} sx={{ display: "flex", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: forgotStep === s ? 32 : 10,
                      height: 10,
                      borderRadius: 5,
                      bgcolor: forgotStep >= s ? "primary.main" : "action.hover",
                      transition: "all 0.3s ease",
                    }}
                  />
                  {s < 3 && (
                    <Box sx={{
                      width: 24, height: 2, mx: 0.5,
                      bgcolor: forgotStep > s ? "primary.main" : "action.hover",
                      transition: "background-color 0.3s ease",
                    }} />
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Error Message */}
          {forgotError && (
            <Box sx={{
              display: "flex", alignItems: "center", gap: 1,
              p: 1.5, borderRadius: 2, mb: 2,
              bgcolor: "error.light", color: "error.contrastText",
            }}>
              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 20, color: "error.main" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{forgotError}</Typography>
            </Box>
          )}

          {forgotStep === 1 && (
            <Stack spacing={2}>
              <Box sx={{ textAlign: "center", mb: 1 }}>
                <Box sx={{
                  width: 64, height: 64, borderRadius: "50%", mx: "auto", mb: 2,
                  bgcolor: "action.hover", display: "grid", placeItems: "center",
                }}>
                  <EmailOutlinedIcon sx={{ fontSize: 32, color: "primary.main" }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Nhập email đã đăng ký để nhận mã xác minh.
                </Typography>
              </Box>
              <TextField label="Email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} fullWidth autoFocus size="small" />
              <Button variant="contained" onClick={handleForgotSendCode} disabled={forgotLoading || !forgotEmail} fullWidth size="large" sx={{ py: 1.5, fontWeight: 700 }}>
                {forgotLoading ? "Đang gửi..." : "Gửi mã xác minh"}
              </Button>
            </Stack>
          )}

          {forgotStep === 2 && (
            <Stack spacing={2}>
              <Box sx={{ textAlign: "center", mb: 1 }}>
                <Box sx={{
                  width: 64, height: 64, borderRadius: "50%", mx: "auto", mb: 2,
                  bgcolor: "action.hover", display: "grid", placeItems: "center",
                }}>
                  <ShieldOutlinedIcon sx={{ fontSize: 32, color: "primary.main" }} />
                </Box>
                <Typography variant="body2" color="text.secondary">Nhập mã 6 chữ số đã gửi đến</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>{forgotEmail}</Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center" }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <TextField
                    key={i}
                    id={`code-${i}`}
                    value={forgotCode[i] || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length > 1) return;
                      const newCode = forgotCode.split("");
                      newCode[i] = val;
                      const code = newCode.join("").slice(0, 6);
                      setForgotCode(code);
                      if (val && i < 5) {
                        setTimeout(() => document.getElementById(`code-${i + 1}`)?.focus(), 10);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !forgotCode[i] && i > 0) {
                        setTimeout(() => document.getElementById(`code-${i - 1}`)?.focus(), 10);
                      }
                    }}
                    slotProps={{ htmlInput: { maxLength: 1, style: { textAlign: "center", fontSize: "1.5rem", fontWeight: 700, width: 48, height: 48, padding: 0 } } }}
                    sx={{
                      "& fieldset": {
                        borderRadius: 2,
                        borderWidth: forgotCode[i] ? 2 : 1,
                        borderColor: forgotCode[i] ? "primary.main" : "divider",
                      },
                      transition: "all 0.2s ease",
                      bgcolor: forgotCode[i] ? "action.selected" : "transparent",
                    }}
                  />
                ))}
              </Box>
              <Button variant="contained" onClick={handleVerifyCode} disabled={forgotLoading || forgotCode.length !== 6} fullWidth size="large" sx={{ py: 1.5, fontWeight: 700 }}>
                {forgotLoading ? "Đang xác minh..." : "Xác minh mã"}
              </Button>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button variant="text" size="small" startIcon={<ArrowBackIcon />} onClick={() => { setForgotStep(1); setForgotCode(""); setForgotError(""); }} sx={{ textTransform: "none" }}>
                  Quay lại
                </Button>
                <Button variant="text" size="small" onClick={handleForgotSendCode} disabled={forgotLoading || resendCooldown > 0} sx={{ textTransform: "none" }}>
                  {resendCooldown > 0 ? `Gửi lại (${resendCooldown}s)` : "Gửi lại mã"}
                </Button>
              </Box>
            </Stack>
          )}

          {forgotStep === 3 && (
            <Stack spacing={2}>
              <Box sx={{ textAlign: "center", mb: 1 }}>
                <Box sx={{
                  width: 64, height: 64, borderRadius: "50%", mx: "auto", mb: 2,
                  bgcolor: "action.hover", display: "grid", placeItems: "center",
                }}>
                  <LockOutlinedIcon sx={{ fontSize: 32, color: "primary.main" }} />
                </Box>
                <Typography variant="body2" color="text.secondary">Tạo mật khẩu mới cho tài khoản của bạn.</Typography>
              </Box>
              <TextField
                label="Mật khẩu mới"
                type={showForgotPassword ? "text" : "password"}
                value={forgotPassword}
                onChange={(e) => setForgotPassword(e.target.value)}
                fullWidth autoFocus size="small"
                slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowForgotPassword(!showForgotPassword)} edge="end" size="small">{showForgotPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment>) } }}
              />
              <TextField
                label="Xác nhận mật khẩu mới"
                type={showForgotPassword ? "text" : "password"}
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                fullWidth size="small"
                error={forgotConfirmPassword.length > 0 && forgotPassword !== forgotConfirmPassword}
                helperText={forgotConfirmPassword.length > 0 && forgotPassword !== forgotConfirmPassword ? "Mật khẩu không khớp" : ""}
              />
              <Button variant="contained" onClick={handleForgotReset} disabled={forgotLoading || !forgotPassword || !forgotConfirmPassword} fullWidth size="large" sx={{ py: 1.5, fontWeight: 700 }}>
                {forgotLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </Button>
              <Button variant="text" size="small" startIcon={<ArrowBackIcon />} onClick={() => { setForgotStep(2); setForgotError(""); setForgotPassword(""); setForgotConfirmPassword(""); }} sx={{ textTransform: "none" }}>
                Quay lại
              </Button>
            </Stack>
          )}

          {forgotStep === 4 && (
            <Stack spacing={2} sx={{ alignItems: "center", py: 3 }}>
              <Box sx={{
                width: 80, height: 80, borderRadius: "50%",
                bgcolor: "success.light", display: "grid", placeItems: "center",
                animation: "scaleIn 0.3s ease-out",
                "@keyframes scaleIn": {
                  "0%": { transform: "scale(0)", opacity: 0 },
                  "100%": { transform: "scale(1)", opacity: 1 },
                },
              }}>
                <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 48, color: "success.main" }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Đặt lại mật khẩu thành công!</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
              </Typography>
              <Button variant="contained" onClick={closeForgotDialog} fullWidth size="large" sx={{ mt: 1, py: 1.5, fontWeight: 700 }}>
                Quay lại đăng nhập
              </Button>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
