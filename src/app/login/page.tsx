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
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import { useAuth } from "@/lib/auth-context";
import api, { getErrorMessage } from "@/lib/api-client";
import dynamic from "next/dynamic";
const LoginBackground3D = dynamic(() => import("@/components/LoginBackground3D"), { ssr: false });

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

  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3 | 4>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const faceFailCountRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCaptureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setCameraReady(false);
  }, []);

  const resetFaceState = () => {
    setImagePreview(null);
  };

  const startCamera = useCallback(async () => {
    try {
      setError("");
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
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!isCameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const onReady = () => setCameraReady(true);
    video.onloadedmetadata = onReady;
    video.onplaying = onReady;
    video.onerror = () => setError("Camera gặp lỗi.");
    video.srcObject = streamRef.current;
    if (video.readyState >= 2) onReady();
    readyTimeoutRef.current = setTimeout(() => setCameraReady(true), 3000);
    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
      if (autoCaptureTimeoutRef.current) clearTimeout(autoCaptureTimeoutRef.current);
      video.onloadedmetadata = null;
      video.onplaying = null;
      video.onerror = null;
      video.srcObject = null;
    };
  }, [isCameraOn]);

  useEffect(() => () => stopCamera(), [stopCamera]);

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
      setTimeout(() => router.push("/dashboard"), 500);
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
    setResendMessage("");
    setUnverifiedEmail("");
    setIsLoading(true);
    try {
      await login(email, password);
      window.location.href = "/dashboard";
    } catch (err: any) {
      const msg = getErrorMessage(err) || "Đăng nhập thất bại.";
      if (msg.toLowerCase().includes("xac thuc email") || msg.toLowerCase().includes("unverified")) {
        setUnverifiedEmail(email);
        setError("");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (_event: React.MouseEvent<HTMLElement>, value: LoginMode | null) => {
    if (!value) return;
    setMode(value);
    setError("");
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
      await api.client.post("/auth/forgot-password", { email: forgotEmail });
      setForgotStep(2);
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
      await api.client.post("/auth/verify-reset-code", { email: forgotEmail, code: forgotCode });
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
      await api.client.post("/auth/reset-password", {
        email: forgotEmail,
        code: forgotCode,
        new_password: forgotPassword,
      });
      setForgotStep(4);
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

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      await api.resendVerification(unverifiedEmail);
      setResendMessage("Đã gửi mã xác thực mới. Vui lòng kiểm tra email.");
    } catch (err: any) {
      setResendMessage("");
      setError(getErrorMessage(err) || "Không thể gửi mã xác thực.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <LoginBackground3D />
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          p: 2,
          position: "relative",
          zIndex: 1,
        }}
      >
      <Paper
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 460,
          p: 4,
          background: `linear-gradient(180deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`,
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center" }}>
            <Box sx={{ width: 58, height: 58, borderRadius: 2, bgcolor: "primary.main", color: "primary.contrastText", display: "grid", placeItems: "center" }}>
              <AutoStoriesOutlinedIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 0 }}>THƯ VIỆN IUH</Typography>
              <Typography color="text.secondary">Đăng nhập vào hệ thống quản lý</Typography>
            </Box>
          </Stack>

          <ToggleButtonGroup value={mode} exclusive onChange={switchMode} fullWidth color="primary">
            <ToggleButton value="password">Mật khẩu</ToggleButton>
            <ToggleButton value="face">Khuôn mặt</ToggleButton>
          </ToggleButtonGroup>

          {error && <Alert severity="error">{error}</Alert>}

          {unverifiedEmail && (
            <Alert
              severity="warning"
              action={
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={resendLoading}
                    onClick={handleResendVerification}
                  >
                    {resendLoading ? "Đang gửi..." : "Gửi lại mã"}
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => router.push("/verify-email")}
                  >
                    Đổi email
                  </Button>
                </Stack>
              }
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Tài khoản chưa xác thực email
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Kiểm tra email <strong>{unverifiedEmail}</strong> để lấy mã OTP.
              </Typography>
            </Alert>
          )}

          {resendMessage && <Alert severity="success">{resendMessage}</Alert>}

          {success ? (
            <Alert icon={<CheckCircleOutlineOutlinedIcon />} severity="success">
              Đăng nhập thành công. Đang chuyển hướng...
            </Alert>
          ) : isLoading ? (
            <Stack sx={{ py: 5, alignItems: "center" }} spacing={2}>
              <CircularProgress />
              <Typography color="text.secondary">{mode === "face" ? "Đang xác thực khuôn mặt..." : "Đang đăng nhập..."}</Typography>
            </Stack>
          ) : mode === "password" ? (
            <Box component="form" onSubmit={handlePasswordSubmit}>
              <Stack spacing={2}>
                <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required fullWidth />
                <TextField label="Mật khẩu" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required fullWidth />
                <Button type="submit" variant="contained" startIcon={<LoginOutlinedIcon />} size="large" fullWidth>
                  Đăng nhập
                </Button>
                <Typography variant="body2" sx={{ textAlign: "center" }}>
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
                      fontSize: "0.875rem",
                      textDecoration: "underline",
                      "&:hover": { color: "primary.dark" },
                    }}
                  >
                    Quên mật khẩu?
                  </Box>
                </Typography>
                <Typography variant="body2" sx={{ textAlign: "center" }}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => router.push("/verify-email")}
                    sx={{
                      border: "none",
                      bgcolor: "transparent",
                      color: "primary.main",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      textDecoration: "underline",
                      "&:hover": { color: "primary.dark" },
                    }}
                  >
                    Xác thực email?
                  </Box>
                </Typography>
              </Stack>
            </Box>
          ) : (
            <Stack spacing={2}>
              <Paper
                variant="outlined"
                sx={{ aspectRatio: "16 / 9", overflow: "hidden", bgcolor: "black", display: "grid", placeItems: "center", position: "relative" }}
              >
                {imagePreview ? (
                  <Box component="img" src={imagePreview} alt="Ảnh khuôn mặt" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : isCameraOn ? (
                  <>
                    <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    {!cameraReady && (
                      <Stack sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,.55)", color: "common.white", alignItems: "center", justifyContent: "center" }}>
                        <CircularProgress color="inherit" size={26} />
                        <Typography variant="body2" sx={{ mt: 1 }}>Đang kết nối camera...</Typography>
                      </Stack>
                    )}
                    {cameraReady && (
                      <Box sx={{ position: "absolute", width: 190, height: 190, border: 2, borderColor: "primary.main", borderRadius: "50%", opacity: 0.7 }} />
                    )}
                  </>
                ) : (
                  <Stack spacing={1} sx={{ alignItems: "center", color: "grey.300" }}>
                    <FaceRetouchingNaturalOutlinedIcon sx={{ fontSize: 42 }} />
                    <Typography>Bật camera để đăng nhập bằng khuôn mặt</Typography>
                  </Stack>
                )}
              </Paper>

              {imagePreview ? (
                <Button variant="outlined" onClick={() => { resetFaceState(); startCamera(); }}>
                  Chụp lại
                </Button>
              ) : !isCameraOn ? (
                <Button variant="contained" startIcon={<PhotoCameraOutlinedIcon />} onClick={startCamera}>
                  Bật camera
                </Button>
              ) : (
                <Button color="error" variant="outlined" startIcon={<StopCircleOutlinedIcon />} onClick={stopCamera}>
                  Tắt camera
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Dialog open={forgotOpen} onClose={closeForgotDialog} maxWidth="xs" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {forgotStep === 4 ? "Thành công" : "Quên mật khẩu"}
            </Typography>
            <IconButton onClick={closeForgotDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {forgotStep < 4 && (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 3, mt: 1 }}>
              {[1, 2, 3].map((s) => (
                <Box key={s} sx={{ display: "flex", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 32, height: 32, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700,
                      bgcolor: forgotStep >= s ? "primary.main" : "action.hover",
                      color: forgotStep >= s ? "primary.contrastText" : "text.secondary",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {forgotStep > s ? "✓" : s}
                  </Box>
                  {s < 3 && (
                    <Box sx={{
                      width: 40, height: 2, mx: 0.5,
                      bgcolor: forgotStep > s ? "primary.main" : "action.hover",
                      transition: "background-color 0.3s ease",
                    }} />
                  )}
                </Box>
              ))}
            </Box>
          )}

          {forgotError && (
            <Alert severity="error" sx={{ mb: 2 }}>{forgotError}</Alert>
          )}

          {forgotStep === 1 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Nhập email để nhận mã xác minh.
              </Typography>
              <TextField
                label="Email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                fullWidth
                autoFocus
              />
              <Button
                variant="contained"
                onClick={handleForgotSendCode}
                disabled={forgotLoading}
                fullWidth
              >
                {forgotLoading ? "Đang gửi..." : "Gửi mã xác minh"}
              </Button>
            </Stack>
          )}

          {forgotStep === 2 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Nhập mã 6 chữ số đã gửi đến <strong>{forgotEmail}</strong>
              </Typography>
              <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
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
                    slotProps={{ htmlInput: { maxLength: 1, style: { textAlign: "center", fontSize: "1.5rem", fontWeight: 700, width: 44, height: 44, padding: 0 } } }}
                    sx={{ "& fieldset": { borderRadius: 1.5 } }}
                  />
                ))}
              </Box>
              <Button
                variant="contained"
                onClick={handleVerifyCode}
                disabled={forgotLoading || forgotCode.length !== 6}
                fullWidth
              >
                {forgotLoading ? "Đang xác minh..." : "Xác minh mã"}
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => { setForgotStep(1); setForgotCode(""); setForgotError(""); }}
              >
                ← Quay lại
              </Button>
            </Stack>
          )}

          {forgotStep === 3 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Tạo mật khẩu mới cho tài khoản của bạn.
              </Typography>
              <TextField
                label="Mật khẩu mới"
                type={showForgotPassword ? "text" : "password"}
                value={forgotPassword}
                onChange={(e) => setForgotPassword(e.target.value)}
                fullWidth
                autoFocus
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowForgotPassword(!showForgotPassword)} edge="end" size="small">
                          {showForgotPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="Xác nhận mật khẩu mới"
                type={showForgotPassword ? "text" : "password"}
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleForgotReset}
                disabled={forgotLoading}
                fullWidth
              >
                {forgotLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => { setForgotStep(2); setForgotError(""); setForgotPassword(""); setForgotConfirmPassword(""); }}
              >
                ← Quay lại
              </Button>
            </Stack>
          )}

          {forgotStep === 4 && (
            <Stack spacing={2} sx={{ alignItems: "center", py: 2 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "success.light", display: "grid", placeItems: "center" }}>
                <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 40, color: "success.main" }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Đặt lại mật khẩu thành công!</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
              </Typography>
              <Button variant="contained" onClick={closeForgotDialog} fullWidth sx={{ mt: 1 }}>
                Quay lại đăng nhập
              </Button>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
    </>
  );
}
